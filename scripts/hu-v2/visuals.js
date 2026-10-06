/**
 * hu-v2 visuals — archive-first, zero yt-dlp, zero copyright risk.
 * Sources: Wikimedia Commons (PD images) + archive.org (PD footage).
 * Ken Burns animation turns stills into cinematic clips.
 */
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const ROOT = path.join(__dirname, '..', '..');
const STATE_FILE = path.join(ROOT, 'data', 'hu_v2_state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
  catch { return { usedImages: [], usedTopics: [] }; }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 1)); }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'HistoryUncutBot/2.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u) => https.get(u, { headers: { 'User-Agent': 'HistoryUncutBot/2.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(res.headers.location);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    get(url);
  });
}

async function commonsImages(query, count, usedSet) {
  const out = [];
  const queries = [query, query + ' world war', query.split(' ').slice(0, 3).join(' ')];
  for (const q of queries) {
    if (out.length >= count) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=20&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`;
      const data = await fetchJson(url);
      if (!data.query || !data.query.pages) continue;
      for (const p of Object.values(data.query.pages)) {
        const info = p.imageinfo && p.imageinfo[0];
        if (!info || (info.mime !== 'image/jpeg' && info.mime !== 'image/png')) continue;
        if ((info.width || 0) < 800) continue;
        const id = 'c_' + Buffer.from(info.url).toString('hex').slice(0, 16);
        if (usedSet.has(id)) continue;
        usedSet.add(id);
        out.push({ id, url: info.url, title: p.title });
        if (out.length >= count) break;
      }
    } catch (e) { console.warn('commons warn:', e.message); }
  }
  return out;
}

async function kenBurns(imgPath, outPath, duration, seed) {
  const modes = [
    `zoompan=z='min(zoom+0.0016,1.25)':d=${Math.round(duration * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1350:fps=30`,
    `zoompan=z='min(zoom+0.0014,1.20)':d=${Math.round(duration * 30)}:x='iw/2-(iw/zoom/2)':y='ih*0.2':s=1080x1350:fps=30`,
    `zoompan=z='max(1.22-0.0015*on,1.05)':d=${Math.round(duration * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1350:fps=30`,
  ];
  const zf = modes[seed % modes.length];
  const cmd = `ffmpeg -y -v error -loop 1 -i "${imgPath}" -t ${duration} -vf "scale=1400:1750:force_original_aspect_ratio=increase,crop=1400:1750,${zf},eq=contrast=1.06:saturation=1.05" -c:v libx264 -preset veryfast -pix_fmt yuv420p "${outPath}"`;
  await execPromise(cmd);
}

/**
 * Build ~nClip Ken Burns clips for a topic. Returns [clipPaths].
 * Falls back to bundled vault MP4s if Commons is exhausted.
 */
async function buildVisuals(topic, nClips, clipSecs, workDir) {
  const state = loadState();
  const usedSet = new Set(state.usedImages);
  const queries = {
    hero: `${topic.title.replace(/#shorts/i, '').replace(/The /i, '')} world war`,
    bizarre: topic.title.replace(/#shorts/i, '').replace(/The /i, '').split(' ').slice(0, 4).join(' '),
    deception: `${topic.title.replace(/#shorts/i, '').replace(/The /i, '')} world war ii`,
  };
  const images = await commonsImages(queries[topic.pillar] || topic.title, nClips, usedSet);
  const clips = [];
  for (let i = 0; i < nClips; i++) {
    const out = path.join(workDir, `vis_${i}.mp4`);
    if (i < images.length) {
      const imgPath = path.join(workDir, `img_${i}.jpg`);
      await downloadFile(images[i].url, imgPath);
      await kenBurns(imgPath, out, clipSecs, i);
      fs.unlink(imgPath, () => {});
    } else {
      // Vault fallback: rotate bundled PD clips (12s each — clamp offset safely)
      const vaultDir = path.join(ROOT, 'assets', 'vault');
      const vaultFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.mp4')).sort();
      const vf = vaultFiles[i % vaultFiles.length];
      const vsrc = path.join(vaultDir, vf);
      let vdur = 12;
      try {
        const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${vsrc}"`);
        vdur = parseFloat(stdout.trim()) || 12;
      } catch {}
      const off = Math.min(5 + ((i * 37) % 90), Math.max(0, vdur - clipSecs - 0.5)).toFixed(1);
      await execPromise(`ffmpeg -y -v error -ss ${off} -i "${vsrc}" -t ${clipSecs} -c:v libx264 -preset veryfast -pix_fmt yuv420p -an "${out}"`);
    }
    clips.push(out);
  }
  state.usedImages = [...usedSet].slice(-600); // keep history bounded
  if (!state.usedTopics.includes(topic.id)) state.usedTopics.push(topic.id);
  saveState(state);
  return clips;
}

module.exports = { buildVisuals };
