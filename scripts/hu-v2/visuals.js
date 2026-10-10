/**
 * hu-v2 visuals — "Muse way" archive sourcing.
 *
 * Source strategy per pillar (no yt-dlp, no copyright risk, ever):
 *   hero      → archive.org PD combat footage first (real motion), Commons stills fill gaps
 *   bizarre   → Commons PD images + Ken Burns (no real footage exists for 1518!)
 *   deception → Commons PD images + Ken Burns, archive.org espionage/WWII reels when topical
 *   fallback  → bundled assets/vault PD clips (never fail the run)
 *
 * Cohesion: subtle film grain + vignette applied at assemble time so mixed
 * sources feel like one cinematic piece.
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
  catch { return { usedImages: [], usedTopics: [], usedArchives: [] }; }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 1)); }

function fetchJson(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'HistoryUncutBot/2.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function downloadFile(url, dest, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const file = fs.createWriteStream(dest);
      const get = (u) => {
        const req = https.get(u, { headers: { 'User-Agent': 'HistoryUncutBot/2.0' } }, res => {
          if (res.statusCode === 429 && n < retries) {
            // rate limited: back off and retry once
            res.resume();
            setTimeout(() => attempt(n + 1), 8000);
            return;
          }
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(res.headers.location);
          if (res.statusCode !== 200) { fs.unlink(dest, () => {}); return reject(new Error('HTTP ' + res.statusCode)); }
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(dest); });
        });
        req.setTimeout(90000, () => { req.destroy(); reject(new Error('dl timeout')); });
        req.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
      };
      get(url);
    };
    attempt(0);
  });
}

/* ---------------- archive.org PD video ---------------- */

async function archiveOrgClips(topic, nClips, clipSecs, workDir, usedArchives) {
  const out = [];
  const kw = topic.archive_query || 'world war ii combat';
  // topic-specific first, then pillar-flavoured fallbacks — wider pool, fewer repeats
  const queries = [
    `${kw}`,
    `${kw} newsreel`,
    topic.pillar === 'hero' ? 'world war ii combat infantry' : `${kw} archive`,
    'us army combat film world war ii',
    'world war ii battlefield archive footage',
  ];
  const seenIds = [];
  for (const q of queries) {
    if (out.length >= nClips) break;
    try {
      const sq = encodeURIComponent(`(${q}) AND mediatype:movies AND (collection:prelinger OR collection:us_national_archives OR collection:wwii_archive OR collection:united_newsreels)`);
      const data = await fetchJson(`https://archive.org/advancedsearch.php?q=${sq}&fl[]=identifier&fl[]=title&rows=25&output=json&sort[]=downloads desc`);
      const docs = (data.response && data.response.docs) || [];
      for (const doc of docs) {
        if (out.length >= nClips) break;
        const id = doc.identifier;
        if (usedArchives.has(id) || seenIds.includes(id)) continue;
        try {
          const meta = await fetchJson(`https://archive.org/metadata/${id}`);
          const files = (meta.files || []).filter(f =>
            /\.mp4$/i.test(f.name) && !/gif|thumb/i.test(f.name));
          if (!files.length) continue;
          // prefer small 512kb versions, skip giants
          files.sort((a, b) => (a.size || 0) - (b.size || 0));
          const pick = files.find(f => /512kb/i.test(f.name) && (f.size || 0) < 400 * 1024 * 1024)
            || files.find(f => (f.size || 0) < 400 * 1024 * 1024)
            || files[0];
          const dlUrl = `https://archive.org/download/${id}/${encodeURIComponent(pick.name)}`;
          const tmp = path.join(workDir, `arch_${out.length}.mp4`);
          console.log(`   🎞️  archive.org: ${id} (${(pick.size / 1048576).toFixed(0)}MB)`);
          if (out.length > 0) await sleep(3000); // be nice to archive.org
          try {
            await downloadFile(dlUrl, tmp);
          } catch (e) {
            console.log(`   ⚠️ archive dl skip ${id}: ${e.message.slice(0, 60)}`);
            continue;
          }
          // duration probe -> safe offset
          let dur = 600;
          try {
            const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tmp}"`);
            dur = parseFloat(stdout.trim()) || 600;
          } catch {}
          const off = Math.max(0, Math.min(dur - clipSecs - 1, 10 + (out.length * 53) % Math.max(1, dur - clipSecs - 11))).toFixed(1);
          const clip = path.join(workDir, `vis_arch_${out.length}.mp4`);
          // NOTE: keep NATIVE aspect ratio here — no portrait pre-crop (it chopped
          // heads/action off landscape footage). assemble.js fits each clip into
          // the video window with a blurred-fill background instead.
          await execPromise(`ffmpeg -y -v error -ss ${off} -i "${tmp}" -t ${clipSecs} -vf "hqdn3d=1.5:1.5:6:6,eq=contrast=1.06:saturation=1.05,unsharp=5:5:0.7" -c:v libx264 -preset veryfast -pix_fmt yuv420p -an "${clip}"`);
          fs.unlink(tmp, () => {});
          usedArchives.add(id);
          seenIds.push(id);
          out.push(clip);
        } catch (e) { console.log(`   ⚠️ archive skip ${id}: ${e.message.slice(0, 80)}`); }
      }
    } catch (e) { console.log(`   ⚠️ archive search fail: ${e.message.slice(0, 80)}`); }
  }
  return out;
}

/* ---------------- Commons PD images + Ken Burns ---------------- */

async function commonsImages(query, count, usedSet) {
  const out = [];
  const queries = [query, query.split(' ').slice(0, 3).join(' ')];
  for (const q of queries) {
    if (out.length >= count) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=20&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&format=json`;
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
    } catch (e) { console.log(`   ⚠️ commons: ${e.message.slice(0, 60)}`); }
  }
  return out;
}

async function kenBurns(imgPath, outPath, duration, seed) {
  const d = Math.round(duration * 30);
  const modes = [
    `zoompan=z='min(zoom+0.0016,1.25)':d=${d}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1350:fps=30`,
    `zoompan=z='min(zoom+0.0014,1.20)':d=${d}:x='iw/2-(iw/zoom/2)':y='ih*0.25':s=1080x1350:fps=30`,
    `zoompan=z='max(1.22-0.0015*on,1.05)':d=${d}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1350:fps=30`,
    `zoompan=z='1.15':d=${d}:x='(iw-iw/zoom)*on/${d}':y='ih/2-(ih/zoom/2)':s=1080x1350:fps=30`,
  ];
  const zf = modes[seed % modes.length];
  await execPromise(`ffmpeg -y -v error -loop 1 -i "${imgPath}" -t ${duration} -vf "scale=1400:1750:force_original_aspect_ratio=increase,crop=1400:1750,${zf},eq=contrast=1.06:saturation=1.05" -c:v libx264 -preset veryfast -pix_fmt yuv420p "${outPath}"`);
}

async function kenBurnsClips(topic, nClips, clipSecs, workDir, usedSet, startIdx) {
  const out = [];
  const q = topic.title.replace(/#shorts/i, '').replace(/^The /i, '').split(' ').slice(0, 4).join(' ');
  const images = await commonsImages(q, nClips, usedSet);
  for (let i = 0; i < nClips; i++) {
    const clip = path.join(workDir, `vis_kb_${startIdx + i}.mp4`);
    if (i < images.length) {
      const imgPath = path.join(workDir, `img_${startIdx + i}.jpg`);
      try {
        await downloadFile(images[i].url, imgPath);
        await kenBurns(imgPath, clip, clipSecs, startIdx + i);
        out.push(clip);
      } catch (e) {
        console.log(`   ⚠️ kenburns skip: ${e.message.slice(0, 60)}`);
      } finally {
        fs.unlink(imgPath, () => {});
      }
    }
  }
  return out;
}

/* ---------------- vault fallback (never fail, never repeat recently) ---------------- */

async function vaultClips(nClips, clipSecs, workDir, startIdx, usedVault) {
  const out = [];
  const vaultDir = path.join(ROOT, 'assets', 'vault');
  let vaultFiles = [];
  try { vaultFiles = fs.readdirSync(vaultDir).filter(f => f.endsWith('.mp4') && !f.startsWith('_')).sort(); } catch {}
  // NOTE: underscore-prefixed mp4s (e.g. _demo_new_footage.mp4) are excluded — demos/docs, not footage.
  // prefer vault files not used in recent runs; fall back to least-recently-used
  const fresh = vaultFiles.filter(f => !usedVault.has(f));
  const pool = fresh.length ? fresh : vaultFiles;
  for (let i = 0; i < nClips; i++) {
    const clip = path.join(workDir, `vis_vault_${startIdx + i}.mp4`);
    if (pool.length) {
      const vf = pool[(startIdx + i) % pool.length];
      usedVault.add(vf);
      const vsrc = path.join(vaultDir, vf);
      let vdur = 12;
      try {
        const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${vsrc}"`);
        vdur = parseFloat(stdout.trim()) || 12;
      } catch {}
      // random-ish offset per run so the same file yields different moments
      const maxOff = Math.max(0, vdur - clipSecs - 0.5);
      const off = (5 + ((Date.now() / 1000 + (startIdx + i) * 37) % Math.max(1, maxOff))).toFixed(1);
      // NOTE: native aspect kept — assemble.js does fit + blurred-fill (no crop).
      // HD-feel grade: light denoise + sharpen so archival footage looks clean/crisp.
      await execPromise(`ffmpeg -y -v error -ss ${off} -i "${vsrc}" -t ${clipSecs} -vf "hqdn3d=1.5:1.5:6:6,unsharp=5:5:0.7" -c:v libx264 -preset veryfast -pix_fmt yuv420p -an "${clip}"`);
    } else {
      // absolute last resort: generated slate (pipeline never dies)
      await execPromise(`ffmpeg -y -v error -f lavfi -i "color=c=0x141419:s=1080x1350:d=${clipSecs}:r=30" -vf "noise=alls=7:allf=t" -c:v libx264 -preset veryfast -pix_fmt yuv420p -an "${clip}"`);
    }
    out.push(clip);
  }
  return out;
}

/* ---------------- main entry ---------------- */

async function buildVisuals(topic, nClips, clipSecs, workDir, opts = {}) {
  const state = loadState();
  const usedSet = new Set(state.usedImages || []);
  const usedArchives = new Set(state.usedArchives || []);
  const usedVault = new Set(state.usedVault || []);
  const clips = [];
  const candidateMode = !!opts.candidates;
  const target = candidateMode ? (opts.candidates || 18) : nClips;

  console.log(`🎬 Visuals for [${topic.pillar}]: need ${candidateMode ? target + ' candidates' : nClips + ' clips'}`);

  // 1. Pillar strategy (candidates mode: more archive.org motion clips for AI scoring)
  if (topic.pillar === 'hero') {
    const nV = candidateMode ? Math.min(6, target) : Math.min(3, Math.max(2, Math.ceil(nClips * 0.4)));
    console.log(`   → ${nV} archive.org motion clips${candidateMode ? ' (candidate pool)' : ' + Ken Burns fill'}`);
    try {
      clips.push(...await archiveOrgClips(topic, nV, clipSecs, workDir, usedArchives));
    } catch (e) { console.log(`   ⚠️ archive.org unavailable: ${e.message.slice(0, 80)}`); }
  } else if (!candidateMode) {
    console.log(`   → Ken Burns stills (no real footage exists for this era)`);
  }

  // 2. Fill remaining with Ken Burns (each download guarded — never kill the run)
  const need = target - clips.length;
  if (need > 0) {
    try {
      clips.push(...await kenBurnsClips(topic, need, clipSecs, workDir, usedSet, clips.length));
    } catch (e) { console.log(`   ⚠️ Ken Burns failed: ${e.message.slice(0, 80)}`); }
  }

  // 3. Vault fallback for anything still missing (candidates mode: only if pool is tiny)
  const stillNeed = (candidateMode ? Math.max(0, 4 - clips.length) : nClips - clips.length);
  if (stillNeed > 0) {
    console.log(`   → ${stillNeed} vault fallback clips`);
    clips.push(...await vaultClips(stillNeed, clipSecs, workDir, clips.length, usedVault));
  }

  state.usedImages = [...usedSet].slice(-600);
  state.usedArchives = [...usedArchives].slice(-200);
  state.usedVault = [...usedVault].slice(-30);
  if (!state.usedTopics.includes(topic.id)) state.usedTopics.push(topic.id);
  saveState(state);
  console.log(`   ✅ ${clips.length}/${nClips} clips ready`);
  return clips;
}

module.exports = { buildVisuals };
