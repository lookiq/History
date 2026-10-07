/**
 * sb-v2 visuals — curated NASA public-domain assets per story beat.
 * Downloads from the NASA Image and Video Library (free, no key):
 *   https://images-api.nasa.gov/asset/{nasa_id}  -> manifest JSON -> file URLs
 * For each beat, tries the topic's curated nasa_assets in order and takes the
 * first that yields a downloadable original file. FAILS LOUD if any beat ends
 * up with zero assets (a silent gap would wreck the video).
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const UA = 'SciBytes-pipeline/1.0 (github-actions)';

async function assetFiles(nasaId) {
  const url = `https://images-api.nasa.gov/asset/${nasaId}`;
  const { stdout } = await execPromise(
    `curl -sL --max-time 40 -A "${UA}" "${url}"`, { maxBuffer: 4 * 1024 * 1024 });
  const data = JSON.parse(stdout);
  const items = (data.collection && data.collection.items) || [];
  return items.map(i => i.href).filter(Boolean);
}

/** Prefer the ~orig / ~large still, or an mp4 for video assets. */
function pickFile(hrefs) {
  const orig = hrefs.find(h => /~orig\.(jpg|png|tif|mp4)/i.test(h));
  if (orig) return orig;
  const mp4 = hrefs.find(h => /\.mp4(\?|$)/i.test(h));
  if (mp4) return mp4;
  const large = hrefs.find(h => /~large\.(jpg|png)/i.test(h));
  if (large) return large;
  return hrefs[0];
}

async function download(url, dest) {
  await execPromise(`curl -sL --max-time 120 --retry 2 -A "${UA}" -o "${dest}" "${url}"`,
    { maxBuffer: 4 * 1024 * 1024 });
  const st = fs.statSync(dest);
  if (st.size < 5000) throw new Error(`download too small (${st.size}b): ${url}`);
}

async function buildVisuals(topic, workDir) {
  const outDir = path.join(workDir, 'nasa');
  fs.mkdirSync(outDir, { recursive: true });
  // group asset IDs by beat, preserving topic order
  const byBeat = {};
  for (const a of topic.nasa_assets || []) {
    (byBeat[a.beat] = byBeat[a.beat] || []).push(a.nasa_id);
  }
  const shots = [];
  for (const beat of Object.keys(byBeat).map(Number).sort((a, b) => a - b)) {
    let done = null;
    const tried = [];
    for (const nid of byBeat[beat]) {
      tried.push(nid);
      try {
        const hrefs = await assetFiles(nid);
        if (!hrefs.length) { console.log(`   🛰️  beat ${beat}: ${nid} has no files — trying next`); continue; }
        const url = pickFile(hrefs);
        const ext = /\.mp4(\?|$)/i.test(url) ? 'mp4' : 'jpg';
        const dest = path.join(outDir, `beat${beat}_${nid.replace(/[^A-Za-z0-9_-]/g, '')}.${ext}`);
        if (!fs.existsSync(dest)) {
          console.log(`   🛰️  beat ${beat}: downloading ${nid}...`);
          await download(url, dest);
        } else {
          console.log(`   🛰️  beat ${beat}: cached ${nid}`);
        }
        done = { path: dest, kind: ext === 'mp4' ? 'video' : 'image', beat, nasa_id: nid };
        break;
      } catch (e) {
        console.log(`   🛰️  beat ${beat}: ${nid} failed (${e.message.slice(0, 70)}) — trying next`);
      }
    }
    if (!done) {
      throw new Error(`beat ${beat} has ZERO usable NASA assets (tried: ${tried.join(', ')})`);
    }
    shots.push(done);
  }
  if (shots.length < 3) {
    throw new Error(`only ${shots.length} distinct visuals — need at least 3 for an 8-part timeline`);
  }
  console.log(`   🛰️  visuals: ${shots.length} shots ready`);
  return shots;
}

module.exports = { buildVisuals, assetFiles };
