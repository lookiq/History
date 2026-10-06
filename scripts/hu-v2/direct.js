/**
 * hu-v2 DIRECTED pipeline — "Muse-directed, GitHub + AI executed".
 *
 * Same $0/month stack as pipeline.js, plus AI clip scoring:
 *   1. topic -> script -> edge-tts voice (Christopher)
 *   2. 15-20 candidate archive clips (visuals.js candidate mode)
 *   3. middle frame per candidate -> score.js (Groq vision, or Gemini if
 *      GEMINI_API_KEY is set) -> best DISTINCT clip per story beat
 *   4. winners trimmed to beat durations (word-timing mapped) ->
 *      karaoke -> master-template assemble -> AI thumbnail -> Telegram
 *   5. score.js fails -> falls back to pipeline.js heuristic matching;
 *      the run NEVER dies.
 */
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const ROOT = path.join(__dirname, '..', '..');
const HU = __dirname;
const { buildScript, buildMetadata, CTA } = require('./script');
const { buildVisuals } = require('./visuals');
const { buildAss } = require('./captions');
const { assemble } = require('./assemble');
const { synthesize } = require('./voice');
const { pickMusic, playlistFor } = require('./music');
const { makeThumbnail, hookWordsFor } = require('./aithumb');

const VOICE = process.env.HU_VOICE || 'en-US-ChristopherNeural';
const CLIP_SECS = 8;
const N_CANDIDATES = 18;

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function stateFile() { return path.join(ROOT, 'data', 'hu_v2_state.json'); }
function loadState() {
  try { return loadJson(stateFile()); } catch { return { usedImages: [], usedTopics: [] }; }
}
function saveState(s) { fs.writeFileSync(stateFile(), JSON.stringify(s, null, 1)); }

function pickTopic() {
  const bank = loadJson(path.join(HU, 'topics.json'));
  const state = loadState();
  let fresh = bank.topics.filter(t => !state.usedTopics.includes(t.id));
  if (fresh.length === 0) {
    console.log('♻️  Topic bank exhausted, starting new cycle');
    state.usedTopics = [];
    saveState(state);
    fresh = bank.topics;
  }
  const recent = state.usedTopics.slice(-9);
  const count = { hero: 0, bizarre: 0, deception: 0 };
  const byId = Object.fromEntries(bank.topics.map(t => [t.id, t]));
  recent.forEach(id => { const t = byId[id]; if (t) count[t.pillar]++; });
  fresh.sort((a, b) => count[a.pillar] - count[b.pillar]);
  const pillar = fresh[0].pillar;
  const topic = fresh.find(t => t.pillar === pillar);
  console.log(`📌 Topic: "${topic.title}" [${pillar}] (${fresh.length} fresh left)`);
  return topic;
}

function wordsOf(t) { return t.split(/\s+/).filter(Boolean).length; }

/**
 * Map script parts -> time ranges using edge-tts word timings.
 * Parts: hook, setup, beats..., payoff, question, cta.
 */
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
    // word-count drift (TTS normalisation) -> proportional fallback
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
    beatIdx: p.name.startsWith('beat') ? parseInt(p.name.slice(4), 10) : -1,
  }));
}

/** Best DISTINCT clip per beat; reuse top scorers when the pool is small. */
function pickWinners(scores, nBeats) {
  const ids = Object.keys(scores);
  const used = new Set();
  const winners = [];
  for (let b = 0; b < nBeats; b++) {
    const ranked = [...ids].sort((a, c) => (scores[c][String(b)] || 0) - (scores[a][String(b)] || 0));
    const pick = ranked.find(id => !used.has(id)) || ranked[0];
    if (pick) { used.add(pick); winners.push(pick); }
  }
  // fillers: remaining clips by best overall score, cycling if needed
  const fillers = [...ids]
    .filter(id => !used.has(id))
    .sort((a, c) => Math.max(...Object.values(scores[c])) - Math.max(...Object.values(scores[a])));
  const pool = fillers.length ? fillers : [...ids].sort((a, c) => Math.max(...Object.values(scores[c])) - Math.max(...Object.values(scores[a])));
  return { winners, fillers: pool, used };
}

async function trimSegment(clipPath, dur, outPath) {
  const loops = dur > CLIP_SECS ? `-stream_loop ${Math.ceil(dur / CLIP_SECS) + 1}` : '';
  await execPromise(
    `ffmpeg -y -v error ${loops} -ss 0 -i "${clipPath}" -t ${dur.toFixed(2)} ` +
    `-c:v libx264 -preset veryfast -pix_fmt yuv420p -an "${outPath}"`
  );
}

async function scoredClips(topic, words, voiceDur, workDir) {
  // 1. candidate pool
  const candidates = await buildVisuals(topic, 0, CLIP_SECS, workDir, { candidates: N_CANDIDATES });
  if (candidates.length < 2) throw new Error(`only ${candidates.length} candidates — not enough to score`);

  // 2. middle frame per candidate
  const framesDir = path.join(workDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  const idOf = {};
  for (const c of candidates) {
    const id = path.basename(c, '.mp4');
    idOf[id] = c;
    await execPromise(`ffmpeg -y -v error -ss ${(CLIP_SECS / 2).toFixed(1)} -i "${c}" -frames:v 1 -q:v 3 "${path.join(framesDir, id + '.jpg')}"`);
  }

  // 3. AI scoring (one request per clip; non-zero exit -> caught -> heuristic fallback)
  const beatsPath = path.join(workDir, 'beats.json');
  const scoresPath = path.join(workDir, 'scores.json');
  fs.writeFileSync(beatsPath, JSON.stringify(topic.beats));
  console.log('🤖 AI clip scoring...');
  await execPromise(`node "${path.join(HU, 'score.js')}" "${framesDir}" "${beatsPath}" "${scoresPath}"`,
    { timeout: 15 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 });
  const scores = loadJson(scoresPath);

  // 4. winners per beat, fillers for the rest
  const { winners, fillers } = pickWinners(scores, topic.beats.length);
  console.log(`   🏆 beat winners: ${winners.join(', ')}`);

  // 5. timeline: one clip per script part, trimmed to the part's duration
  const parts = partTimings(topic, words, voiceDur);
  const totalSecs = Math.ceil(voiceDur) + 2;
  const slack = totalSecs - parts.reduce((a, p) => a + p.dur, 0);
  parts[parts.length - 1].dur += Math.max(0, slack); // CTA absorbs the tail
  let fi = 0;
  const segs = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    let clipId;
    if (p.beatIdx >= 0 && winners[p.beatIdx]) clipId = winners[p.beatIdx];
    else { clipId = fillers[fi % fillers.length]; fi++; }
    const seg = path.join(workDir, `seg_${i}_${p.name}.mp4`);
    await trimSegment(idOf[clipId], p.dur, seg);
    segs.push(seg);
    console.log(`   🎞️  ${p.name} (${p.dur.toFixed(1)}s) <- ${clipId}`);
  }
  return { clips: segs, totalSecs };
}

async function qcFrames(mp4, workDir, stamp) {
  const outs = [];
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp4}"`);
    const dur = parseFloat(stdout.trim()) || 60;
    for (const [i, frac] of [0.2, 0.4, 0.6, 0.8].entries()) {
      const out = path.join(workDir, `qc_${stamp}_${i}.jpg`);
      await execPromise(`ffmpeg -y -v error -ss ${(dur * frac).toFixed(1)} -i "${mp4}" -frames:v 1 -q:v 3 "${out}"`);
      outs.push(out);
    }
    console.log(`   📸 QC frames: ${outs.length}`);
  } catch (e) { console.log(`   ⚠️ QC frames failed: ${e.message.slice(0, 60)}`); }
  return outs;
}

async function main() {
  const t0 = Date.now();
  const topic = pickTopic();
  const script = buildScript(topic);
  const meta = buildMetadata(topic, script);
  console.log(`📜 Script: ${script.words} words (~${script.estSecs}s)`);

  const work = path.join(ROOT, 'data', 'hu_v2_work');
  fs.mkdirSync(work, { recursive: true });
  const stamp = Date.now();
  const scriptTxt = path.join(work, `script_${stamp}.txt`);
  const voiceMp3 = path.join(work, `voice_${stamp}.mp3`);
  const wordsJson = path.join(work, `words_${stamp}.json`);

  // 1. Voiceover
  console.log('🎙️  Voiceover via edge-tts...');
  const { words, voice } = await synthesize(script.text, VOICE, voiceMp3, wordsJson, scriptTxt);
  console.log(`   🔊 Final voice: ${voice}`);
  const voiceDur = words[words.length - 1].e;
  let totalSecs = Math.ceil(voiceDur) + 2;
  console.log(`   🔊 Voice: ${voiceDur.toFixed(1)}s, total video: ${totalSecs}s`);

  // 2-3. Visuals: AI-scored, with heuristic fallback
  let clips, scored = false;
  try {
    const r = await scoredClips(topic, words, voiceDur, work);
    clips = r.clips;
    totalSecs = r.totalSecs;
    scored = true;
    console.log(`   ✅ AI-directed visuals (${clips.length} segments)`);
  } catch (e) {
    console.log(`   ⚠️ AI scoring unavailable (${e.message.slice(0, 90)}) — heuristic fallback`);
    const nClips = Math.ceil(totalSecs / CLIP_SECS);
    clips = await buildVisuals(topic, nClips, CLIP_SECS, work);
  }

  // 4. Karaoke captions
  const assPath = path.join(work, `caps_${stamp}.ass`);
  const contextLine = topic.setup.split('. ')[0].trim().replace(/\.$/, '') + '.';
  const { lines } = buildAss(words, assPath, totalSecs, contextLine);
  console.log(`💬 Karaoke: ${lines} caption lines | context: "${contextLine}"`);

  // 5. Assemble on the master template
  const outMp4 = path.join(work, `history_uncut_${topic.id}_${stamp}.mp4`);
  await assemble({ clips, assPath, voiceMp3, outPath: outMp4, totalSecs });
  console.log(`✅ Assembled: ${outMp4} ${scored ? '(AI-scored)' : '(heuristic)'}`);

  // 6. Thumbnail — AI first, frame fallback
  const thumbJpg = path.join(work, `thumb_${stamp}.jpg`);
  await makeThumbnail({ topic, mp4Path: outMp4, outPath: thumbJpg, hookWords: hookWordsFor(topic) });

  // 7. QC sample frames (uploaded as workflow artifacts)
  await qcFrames(outMp4, work, stamp);

  // 8. Meta for the state commit
  const metaDir = path.join(ROOT, 'data', 'videos');
  fs.mkdirSync(metaDir, { recursive: true });
  const keywords = topic.title.replace(/#shorts/i, '').trim();
  fs.writeFileSync(path.join(metaDir, `hu_v2_${stamp}.json`), JSON.stringify({
    videoPath: outMp4,
    title: meta.title,
    description: meta.description,
    tags: [keywords, 'history shorts', 'the history uncut', 'history facts', 'shocking history', 'untold history', 'shorts'],
    customThumbnail: thumbJpg,
    topicId: topic.id,
    pillar: topic.pillar,
    aiScored: scored,
  }, null, 1));

  // 9. Telegram delivery (primary — Md reviews & uploads manually from his phone)
  const { deliver } = require('./telegram');
  const musicSalt = (loadState().usedTopics || []).length;
  const music = pickMusic(topic.pillar, musicSalt);
  const playlist = playlistFor(topic.pillar);
  console.log(`   🎵 Music suggestion: ${music}`);
  console.log(`   📋 Playlist: ${playlist}`);
  await deliver({ videoPath: outMp4, title: meta.title, description: meta.description, topicId: topic.id, music, playlist, thumbnailPath: thumbJpg });

  console.log('   📤 YouTube auto-upload disabled — Telegram delivery is the final handoff');
  console.log(`\n🎉 DONE in ${Math.round((Date.now() - t0) / 1000)}s — "${meta.title}" ${scored ? '[AI-scored]' : '[heuristic]'}`);
}

main().catch(e => { console.error('❌ Directed pipeline failed:', e.message); process.exit(1); });
