/**
 * sb-v2 DIRECTED pipeline — one SciBytes Short per run (the workflow loops it).
 *
 *   1. pillar-rotated pickTopic (state: data/sb_v2_state.json)
 *   2. buildScript -> edge-tts VO (SB_VOICE || en-US-ChristopherNeural)
 *   3. curated NASA visuals per beat (visuals.js)
 *   4. motion.py: eased Ken Burns + zoom-blur/whip/hard transitions
 *   5. cyan karaoke ASS captions (captions.js)
 *   6. two-pass assemble: watermark + captions + final-5s pill + VO mux
 *   7. AI thumbnail (hu-v2/aithumb) -> QC frames -> Telegram deliver()
 *      with the 5-block format (title/description/tags/pinned/checklist)
 *      + music + playlist + thumbnail + SB_BATCH_LABEL
 *   8. append to data/sb_v2_work/sb_batch_manifest.json
 *
 * The run NEVER dies on a single failure: main() wraps everything in
 * try/catch and exits non-zero with a clear error (the workflow continues
 * the batch loop).
 */
const path = require('path');
const fs = require('fs');
const { exec, execFile } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const execFilePromise = util.promisify(execFile);

const ROOT = path.join(__dirname, '..', '..');
const SB = __dirname;
const { buildScript, buildMetadata, CTA } = require('./script');
const { buildVisuals } = require('./visuals');
const { buildAss, MARGIN_V } = require('./captions');
const { assemble } = require('./assemble');
const { synthesize } = require('../hu-v2/voice');
const { pickMusic, playlistFor } = require('./music');
const { makeThumbnail, hookWordsFor } = require('../hu-v2/aithumb');
const { deliver } = require('../hu-v2/telegram');

const VOICE = process.env.SB_VOICE || 'en-US-ChristopherNeural';
const PILL_PNG = path.join(ROOT, 'assets', 'sb', 'scibytes-subscribe-pill.png');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function stateFile() { return path.join(ROOT, 'data', 'sb_v2_state.json'); }
function loadState() {
  try { return loadJson(stateFile()); } catch { return { usedTopics: [], musicSalt: 0 }; }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify(s, null, 1));
}

function pickTopic() {
  const bank = loadJson(path.join(SB, 'topics.json'));
  const state = loadState();
  // published_blocklist: topics Md already built/uploaded manually (e.g. Ingenuity,
  // published 2026-10-07, flagged duplicate 2026-10-08). Never re-picked — even
  // across bank-exhaustion resets, unlike state.usedTopics. Mirrors Factify's
  // MANUAL_BLOCKLIST. Edit via topics.json, no code change needed.
  const blocked = new Set(bank.published_blocklist || []);
  const topics = bank.topics.filter(t => !blocked.has(t.id));
  let fresh = topics.filter(t => !state.usedTopics.includes(t.id));
  if (fresh.length === 0) {
    console.log('♻️  SciBytes topic bank exhausted, starting new cycle');
    state.usedTopics = [];
    saveState(state);
    fresh = topics;
  }
  const recent = state.usedTopics.slice(-9);
  const count = { mystery: 0, origins: 0, epic: 0 };
  const byId = Object.fromEntries(topics.map(t => [t.id, t]));
  recent.forEach(id => { const t = byId[id]; if (t) count[t.pillar]++; });
  fresh.sort((a, b) => count[a.pillar] - count[b.pillar]);
  const pillar = fresh[0].pillar;
  const topic = fresh.find(t => t.pillar === pillar);
  console.log(`📌 Topic: "${topic.title}" [${pillar}] (${fresh.length} fresh left)`);
  return { topic, state };
}

function wordsOf(t) { return t.split(/\s+/).filter(Boolean).length; }

/** Map script parts -> time ranges using edge-tts word timings. */
function partTimings(topic, words, voiceDur) {
  const parts = [
    { name: 'hook', text: topic.hook },
    { name: 'setup', text: topic.setup },
    ...topic.beats.map((b, i) => ({ name: `beat${i}`, text: b })),
    { name: 'payoff', text: topic.payoff },
    { name: 'question', text: topic.question },
    { name: 'cta', text: CTA },
  ];
  const counts = parts.map(p => wordsOf(p.text));
  const total = counts.reduce((a, b) => a + b, 0);
  let offsets = [];
  if (words.length === total) {
    let o = 0;
    offsets = counts.map(c => { const s = o; o += c; return s; });
  } else {
    console.log(`   ⚠️ word count drift (${words.length} vs ${total}) — proportional timing`);
    let o = 0;
    offsets = counts.map(c => { const s = Math.round(o); o += (c / total) * words.length; return Math.min(s, words.length - 1); });
  }
  const bounds = [words[0].s];
  for (let i = 0; i < parts.length - 1; i++) {
    const endPrev = words[Math.min(offsets[i] + counts[i] - 1, words.length - 1)].e;
    const startNext = words[Math.min(offsets[i + 1], words.length - 1)].s;
    bounds.push((endPrev + startNext) / 2);
  }
  bounds.push(Math.max(words[words.length - 1].e, voiceDur));
  return parts.map((p, i) => ({
    ...p,
    start: Math.max(0, bounds[i]),
    end: bounds[i + 1],
    dur: Math.max(1.5, bounds[i + 1] - bounds[i]),
  }));
}

/**
 * Map script parts -> visual shots. The topic's curated visuals are dealt
 * round-robin across the 8 parts, never repeating the same visual
 * back-to-back. Energy beats get whip-pans; the punchy question gets a
 * hard cut into it.
 */
function planShots(parts, visuals) {
  const n = visuals.length;
  let vi = 0, prev = -1;
  return parts.map(p => {
    let idx = vi % n;
    if (idx === prev && n > 1) { vi++; idx = vi % n; } // never back-to-back
    prev = idx; vi++;
    const v = visuals[idx];
    return {
      path: v.path,
      kind: v.kind,
      dur: +p.dur.toFixed(2),
      energy: p.name === 'beat1' || p.name === 'payoff',
      transition: p.name === 'payoff' ? 'hard' : 'zoom',
      part: p.name,
    };
  });
}

async function ffprobeDur(p) {
  const { stdout } = await execPromise(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`);
  return parseFloat(stdout.trim());
}

async function qcFrames(mp4, workDir, stamp) {
  const outs = [];
  try {
    const dur = await ffprobeDur(mp4);
    for (const [i, frac] of [0.2, 0.4, 0.6, 0.8].entries()) {
      const out = path.join(workDir, `qc_${stamp}_${i}.jpg`);
      await execPromise(`ffmpeg -y -v error -ss ${(dur * frac).toFixed(1)} -i "${mp4}" -frames:v 1 -q:v 3 "${out}"`);
      outs.push(out);
    }
    console.log(`   📸 QC frames: ${outs.length}`);
  } catch (e) { console.log(`   ⚠️ QC frames failed: ${e.message.slice(0, 60)}`); }
  return outs;
}

function scibytesChecklist({ title, music }) {
  return [
    `Title pasted exactly: "${title}"`,
    'Description (body + hashtags) pasted as one block',
    'Tags pasted into YouTube tags field (comma-separated)',
    'Pinned comment posted after upload',
    'Captions verified on-device (CYAN karaoke syncs to voiceover)',
    `Music added at upload: ${music} (NOT baked into the video)`,
    'Subscribe pill visible ONLY in final 5 seconds, just below captions',
    'Visibility: Public | Audience: Not made for kids | Shorts remix: Allow',
  ].map(l => '• ' + l).join('\n');
}

async function main() {
  const runId = Date.now().toString(36);
  const workDir = path.join(ROOT, 'data', 'sb_v2_work', runId);
  fs.mkdirSync(workDir, { recursive: true });

  const { topic, state } = pickTopic();
  const meta = buildMetadata(topic);
  const script = buildScript(topic);
  console.log(`📝 Script: ${script.words} words (~${script.estSecs}s)`);

  // 1. Voice
  const voiceMp3 = path.join(workDir, 'vo.mp3');
  const wordsPath = path.join(workDir, 'words.json');
  console.log(`🎙️ Synthesizing VO (${VOICE})...`);
  const { words } = await synthesize(script.text, VOICE, voiceMp3, wordsPath, path.join(workDir, 'vo.txt'));
  const voiceDur = await ffprobeDur(voiceMp3);
  console.log(`   🎙️ VO: ${voiceDur.toFixed(1)}s, ${words.length} words`);

  // 2. Visuals (curated NASA per beat — fails loud on gaps)
  const visuals = await buildVisuals(topic, workDir);

  // 3. Motion (eased Ken Burns + locked transitions)
  const parts = partTimings(topic, words, voiceDur);
  const shots = planShots(parts, visuals);
  const shotsJson = path.join(workDir, 'shots.json');
  const segmentsMp4 = path.join(workDir, 'segments.mp4');
  fs.writeFileSync(shotsJson, JSON.stringify({ shots, out: segmentsMp4, fps: 30 }, null, 1));
  console.log('🎞️ motion.py: eased Ken Burns + zoom-blur/whip/hard transitions...');
  await execFilePromise('python3', [path.join(SB, 'motion.py'), shotsJson],
    { maxBuffer: 16 * 1024 * 1024 });
  const totalSecs = await ffprobeDur(segmentsMp4);
  console.log(`   🎞️ segments: ${totalSecs.toFixed(1)}s`);

  // 4. Captions (cyan karaoke)
  const assPath = path.join(workDir, 'captions.ass');
  const { lines } = buildAss(words, assPath, totalSecs);
  console.log(`   💬 captions: ${lines} events, CYAN karaoke`);

  // 5. Assemble (watermark + captions + final-5s pill + VO)
  if (!fs.existsSync(PILL_PNG)) throw new Error(`pill PNG missing: ${PILL_PNG}`);
  const outMp4 = path.join(workDir, `scibytes_${topic.id}.mp4`);
  await assemble({ segmentsMp4, assPath, voiceMp3, outPath: outMp4, totalSecs, pillPng: PILL_PNG, marginV: MARGIN_V });

  // 6. Thumbnail
  const thumbJpg = path.join(workDir, `thumb_${topic.id}.jpg`);
  await makeThumbnail({ topic, mp4Path: outMp4, outPath: thumbJpg, hookWords: hookWordsFor(topic) });
  console.log(`   🖼️ thumbnail: ${thumbJpg}`);

  // 7. QC frames
  const qc = await qcFrames(outMp4, workDir, topic.id);

  // 8. Telegram delivery — 5-block format + tags + music + playlist + thumbnail
  const music = pickMusic(topic.pillar, state.musicSalt || 0);
  const checklist = scibytesChecklist({ title: meta.title, music });
  await deliver({
    videoPath: outMp4,
    title: meta.title,
    description: meta.description,
    topicId: topic.id,
    tags: meta.tags,
    music,
    playlist: playlistFor(),
    thumbnailPath: thumbJpg,
    batchLabel: process.env.SB_BATCH_LABEL || '',
    pinnedComment: meta.pinnedComment,
    focusKeyword: meta.focusKeyword,
    checklist,
  });

  // 9. State + manifest
  state.usedTopics.push(topic.id);
  state.musicSalt = (state.musicSalt || 0) + 1;
  saveState(state);
  const manifestPath = path.join(ROOT, 'data', 'sb_v2_work', 'sb_batch_manifest.json');
  let manifest = [];
  try { manifest = loadJson(manifestPath); } catch {}
  manifest.push({
    topicId: topic.id, title: meta.title, pillar: topic.pillar,
    video: outMp4, thumbnail: thumbJpg, qc, music,
    playlist: playlistFor(), focusKeyword: meta.focusKeyword,
    words: script.words, totalSecs: +totalSecs.toFixed(1),
    voice: VOICE, builtAt: new Date().toISOString(),
  });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  const videosDir = path.join(ROOT, 'data', 'videos');
  fs.mkdirSync(videosDir, { recursive: true });
  fs.writeFileSync(path.join(videosDir, `sb_v2_${topic.id}.json`),
    JSON.stringify(manifest[manifest.length - 1], null, 1));

  console.log(`✅ DONE: ${outMp4}`);
}

main().catch(e => { console.error('❌ sb-v2 failed:', e.message); process.exit(1); });
