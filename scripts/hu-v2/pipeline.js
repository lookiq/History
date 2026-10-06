/**
 * hu-v2 pipeline — The History Uncut autonomous Shorts, "Muse way".
 * Free forever: no LLM API, no ElevenLabs, no yt-dlp. $0/month.
 *
 * Flow: topic -> script -> edge-tts voice -> Commons/archive visuals ->
 *       gold karaoke -> Four Chaplains composite -> YouTube upload
 */
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const ROOT = path.join(__dirname, '..', '..');
const HU = path.join(__dirname);
const { buildScript, buildMetadata } = require('./script');
const { buildVisuals } = require('./visuals');
const { buildAss } = require('./captions');
const { assemble } = require('./assemble');

const VOICE = process.env.HU_VOICE || 'en-US-GuyNeural';
const CLIP_SECS = 8;

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
  if (fresh.length === 0) { // all used -> reset cycle, keep going forever
    console.log('♻️  Topic bank exhausted, starting new cycle');
    state.usedTopics = [];
    saveState(state);
    fresh = bank.topics;
  }
  // Pillar rotation: prefer pillar least used recently
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

async function ffprobeDuration(mp3) {
  const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp3}"`);
  return parseFloat(stdout.trim());
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
  fs.writeFileSync(scriptTxt, script.text);

  // 1. Voiceover (edge-tts, free unlimited)
  console.log('🎙️  Voiceover via edge-tts...');
  await execPromise(`python3 "${path.join(HU, 'word_times.py')}" "${scriptTxt}" "${VOICE}" "${voiceMp3}" "${wordsJson}"`);
  const words = loadJson(wordsJson);
  if (!words.length) throw new Error('Voiceover produced no words');
  const voiceDur = words[words.length - 1].e;
  const totalSecs = Math.ceil(voiceDur) + 2;
  console.log(`   🔊 Voice: ${voiceDur.toFixed(1)}s, total video: ${totalSecs}s`);

  // 2. Visuals (archive-first)
  const nClips = Math.ceil(totalSecs / CLIP_SECS);
  console.log(`🎬 Sourcing ${nClips} archive visuals...`);
  const clips = await buildVisuals(topic, nClips, CLIP_SECS, work);

  // 3. Karaoke captions
  const assPath = path.join(work, `caps_${stamp}.ass`);
  const { lines } = buildAss(words, assPath);
  console.log(`💬 Karaoke: ${lines} caption lines`);

  // 4. Branded panel
  const panelPng = path.join(work, `panel_${stamp}.png`);
  await execPromise(`python3 "${path.join(HU, 'panel.py')}" "${panelPng}"`);

  // 5. Assemble composite
  const outMp4 = path.join(work, `history_uncut_${topic.id}_${stamp}.mp4`);
  await assemble({ clips, panelPng, assPath, voiceMp3, outPath: outMp4, totalSecs });
  console.log(`✅ Assembled: ${outMp4}`);

  // 6. Thumbnail (frame + bold hook text)
  const thumbJpg = path.join(work, `thumb_${stamp}.jpg`);
  const hookWords = topic.title.replace('#shorts', '').split(' ').filter(w => !['The', 'A'].includes(w)).slice(0, 3).join(' ').toUpperCase();
  await execPromise(`python3 "${path.join(HU, 'thumb.py')}" "${outMp4}" "${thumbJpg}" "${hookWords}"`);

  // 7. Meta for uploader
  const metaDir = path.join(ROOT, 'data', 'videos');
  fs.mkdirSync(metaDir, { recursive: true });
  const metaPath = path.join(metaDir, `hu_v2_${stamp}.json`);
  const keywords = topic.title.replace(/#shorts/i, '').trim();
  fs.writeFileSync(metaPath, JSON.stringify({
    videoPath: outMp4,
    title: meta.title,
    description: meta.description,
    tags: [keywords, 'history shorts', 'the history uncut', 'history facts', 'shocking history', 'untold history', 'shorts'],
    customThumbnail: thumbJpg,
    topicId: topic.id,
    pillar: topic.pillar,
  }, null, 1));

  // 8. Upload (reuse proven uploader; 0h = instant public)
  console.log('📤 Uploading to YouTube...');
  await execPromise(`node "${path.join(ROOT, 'scripts', 'upload-and-schedule-short.js')}" "${metaPath}" "0"`, { maxBuffer: 50 * 1024 * 1024 });

  console.log(`\n🎉 DONE in ${Math.round((Date.now() - t0) / 1000)}s — "${meta.title}"`);
}

main().catch(e => { console.error('❌ Pipeline failed:', e.message); process.exit(1); });
