#!/usr/bin/env node
/**
 * hu-v2 AI clip scoring — picks the best archive clip per story beat.
 *
 * Usage: node score.js <framesDir> <beatsJson> <outJson>
 *   framesDir : one .jpg per candidate clip, named <clipId>.jpg
 *   beatsJson : JSON array of beat description strings
 *   outJson   : written as { "<clipId>": { "0": 8, "1": 3, ... }, ... }
 *
 * Provider (auto):
 *   GEMINI_API_KEY set -> Google Gemini NATIVE generateContent endpoint,
 *                        gemini-2.5-flash (the OpenAI-compatible endpoint is
 *                        not enabled for new AI Studio projects as of Oct 2026)
 *   else               -> GROQ_API_KEY via https://api.groq.com/openai/v1/chat/completions
 *                        (vision model picked at runtime from /openai/v1/models:
 *                         prefer "scout", else "maverick", else "vision"/"llama-4")
 *
 * Frames are resized to max 512px before upload (cheap + fast).
 * ONE API request per clip. Any unrecoverable failure -> exit(1)
 * (caller falls back to the heuristic clip matching so the run never dies).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const REQ_TIMEOUT_MS = 60000;
const BETWEEN_MS = 2500;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function postJson(url, headers, body, timeoutMs = REQ_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? require('https') : require('http');
    const data = JSON.stringify(body);
    const req = lib.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode === 429) return reject(new Error('HTTP 429 rate limited'));
        if (res.statusCode < 200 || res.statusCode >= 300)
          return reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0, 160)}`));
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error('bad JSON response: ' + d.slice(0, 120))); }
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('request timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url, headers, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = require('https').request({
      hostname: u.hostname, port: 443, path: u.pathname + u.search,
      method: 'GET', headers,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300)
          return reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0, 120)}`));
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error('bad JSON: ' + d.slice(0, 120))); }
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function pickGroqVisionModel(apiKey) {
  const data = await getJson('https://api.groq.com/openai/v1/models',
    { Authorization: `Bearer ${apiKey}` });
  const ids = (data.data || []).map(m => m.id);
  const pick = ids.find(id => /scout/i.test(id))
    || ids.find(id => /maverick/i.test(id))
    || ids.find(id => /vision/i.test(id))
    || ids.find(id => /llama-4/i.test(id));
  if (!pick) throw new Error('no vision-capable model found on Groq (checked ' + ids.length + ' models)');
  return pick;
}

function parseScores(text, nBeats, clipId) {
  const m = text.match(/\{[\s\S]*?\}/);
  if (!m) throw new Error('no JSON object in reply');
  const obj = JSON.parse(m[0]);
  const out = {};
  for (let i = 0; i < nBeats; i++) {
    const v = Number(obj[String(i)]);
    if (!Number.isFinite(v) || v < 0 || v > 10)
      throw new Error(`bad score for beat ${i}: ${JSON.stringify(obj)}`);
    out[String(i)] = Math.round(v);
  }
  return out;
}

async function scoreClipOpenAI({ endpoint, headers, model }, frameB64, beats, clipId, nBeats) {
  const sceneList = beats.map((b, i) => `[${i}] ${b}`).join('\n');
  const body = {
    model,
    temperature: 0,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `You are a documentary film editor. Score how well this still frame fits EACH scene below as a video clip, 0 (no match) to 10 (perfect match). Consider setting, era, action, and mood.\n\nScenes:\n${sceneList}\n\nReply with ONLY a JSON object like {"0":8,"1":3} — no other text.` },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frameB64}` } },
      ],
    }],
  };
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await postJson(endpoint, headers, body);
      const text = res.choices && res.choices[0] && res.choices[0].message
        && res.choices[0].message.content;
      if (!text) throw new Error('empty model reply');
      return parseScores(text, nBeats, clipId);
    } catch (e) {
      lastErr = e;
      console.log(`   🔍 ${clipId}: attempt ${attempt + 1} failed: ${e.message.slice(0, 70)}`);
      await sleep(4000);
    }
  }
  throw lastErr;
}

/** Gemini via the native generateContent endpoint (x-goog-api-key header). */
const GEMINI_MODEL_CANDIDATES = [
  'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash',
];

/** Probe candidate models with a tiny text request; return the first that works. */
async function pickGeminiModel(apiKey) {
  for (const m of GEMINI_MODEL_CANDIDATES) {
    try {
      const res = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        { 'x-goog-api-key': apiKey },
        { contents: [{ parts: [{ text: 'Reply with only: OK' }] }],
          generationConfig: { maxOutputTokens: 5 } },
        30000);
      const t = res.candidates && res.candidates[0] && res.candidates[0].content
        && res.candidates[0].content.parts && res.candidates[0].content.parts[0]
        && res.candidates[0].content.parts[0].text;
      if (t) { console.log(`   🔍 Gemini model probe OK: ${m}`); return m; }
    } catch (e) {
      console.log(`   🔍 Gemini model ${m} unavailable: ${e.message.slice(0, 60)}`);
    }
  }
  throw new Error('no working Gemini model found (tried ' + GEMINI_MODEL_CANDIDATES.join(', ') + ')');
}

async function scoreClipGemini(apiKey, model, frameB64, beats, clipId, nBeats) {
  const sceneList = beats.map((b, i) => `[${i}] ${b}`).join('\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{
      parts: [
        { text: `You are a documentary film editor. Score how well this still frame fits EACH scene below as a video clip, 0 (no match) to 10 (perfect match). Consider setting, era, action, and mood.\n\nScenes:\n${sceneList}\n\nReply with ONLY a JSON object like {"0":8,"1":3} — no other text.` },
        { inline_data: { mime_type: 'image/jpeg', data: frameB64 } },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 300, responseMimeType: 'application/json' },
  };
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await postJson(url, { 'x-goog-api-key': apiKey }, body);
      const text = res.candidates && res.candidates[0] && res.candidates[0].content
        && res.candidates[0].content.parts && res.candidates[0].content.parts[0]
        && res.candidates[0].content.parts[0].text;
      if (!text) throw new Error('empty model reply: ' + JSON.stringify(res).slice(0, 160));
      return parseScores(text, nBeats, clipId);
    } catch (e) {
      lastErr = e;
      console.log(`   🔍 ${clipId}: attempt ${attempt + 1} failed: ${e.message.slice(0, 70)}`);
      await sleep(4000);
    }
  }
  throw lastErr;
}

async function main() {
  const [framesDir, beatsPath, outPath] = process.argv.slice(2);
  if (!framesDir || !beatsPath || !outPath) {
    console.error('Usage: node score.js <framesDir> <beatsJson> <outJson>');
    process.exit(2);
  }
  const beats = JSON.parse(fs.readFileSync(beatsPath, 'utf-8'));
  if (!Array.isArray(beats) || beats.length === 0) throw new Error('beats JSON must be a non-empty array');

  const frames = fs.readdirSync(framesDir).filter(f => /\.jpg$/i.test(f)).sort();
  if (!frames.length) throw new Error('no .jpg frames in ' + framesDir);
  console.log(`🔍 Scoring ${frames.length} clips against ${beats.length} beats...`);

  // ---- provider selection ----
  let provider, endpoint, headers, model, geminiKey, geminiModel;
  if (process.env.GEMINI_API_KEY) {
    provider = 'gemini';
    geminiKey = process.env.GEMINI_API_KEY;
    geminiModel = await pickGeminiModel(geminiKey);
    console.log(`   🔍 provider: Gemini native (${geminiModel})`);
  } else if (process.env.GROQ_API_KEY) {
    provider = 'groq';
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { Authorization: `Bearer ${process.env.GROQ_API_KEY}` };
    model = await pickGroqVisionModel(process.env.GROQ_API_KEY);
    console.log(`   🔍 provider: Groq (${model})`);
  } else {
    throw new Error('neither GEMINI_API_KEY nor GROQ_API_KEY is set');
  }

  // ---- score each clip (one request per clip) ----
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-'));
  const results = {};
  try {
    for (const f of frames) {
      const clipId = f.replace(/\.jpg$/i, '');
      const src = path.join(framesDir, f);
      const small = path.join(tmpDir, f);
      await execPromise(`ffmpeg -y -v error -i "${src}" -vf "scale='min(512,iw)':-2" -q:v 4 "${small}"`);
      const b64 = fs.readFileSync(small).toString('base64');
      results[clipId] = provider === 'gemini'
        ? await scoreClipGemini(geminiKey, geminiModel, b64, beats, clipId, beats.length)
        : await scoreClipOpenAI({ endpoint, headers, model }, b64, beats, clipId, beats.length);
      console.log(`   🔍 ${clipId}: ${JSON.stringify(results[clipId])}`);
      await sleep(BETWEEN_MS);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(results, null, 1));
  console.log(`✅ Scores -> ${outPath}`);
}

main().catch(e => { console.error('❌ Scoring failed:', e.message); process.exit(1); });
