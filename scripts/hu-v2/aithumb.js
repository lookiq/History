/**
 * hu-v2 AI thumbnails — Pollinations.ai (free, no API key).
 *
 * Generates an epic cinematic vertical scene for the topic, then overlays the
 * hook words in Cinzel ExtraBold (white + thick black stroke, upper-third).
 * `private=true` keeps generations out of Pollinations' public feed.
 *
 * On ANY failure returns null — the caller falls back to thumb.py
 * (frame + bold hook text), so a thumbnail is always produced.
 */
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const HU = __dirname;

const PILLAR_MOOD = {
  hero: 'lone soldier heroic battlefield moment',
  bizarre: 'surreal strange historical scene',
  deception: 'shadowy WWII espionage scene',
};

function buildPrompt(topic) {
  const fk = (topic.focus_keyword || topic.title.replace(/#shorts/i, '').trim()).slice(0, 80);
  const mood = PILLAR_MOOD[topic.pillar] || PILLAR_MOOD.hero;
  return `epic cinematic vertical scene of ${fk}, ${mood}, dramatic lighting, high contrast, photorealistic, 9:16 vertical, no text, no words, no watermark`;
}

function thumbUrl(topic) {
  const prompt = buildPrompt(topic);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1080&height=1920&nologo=true&private=true&model=flux`;
}

async function download(url, dest, timeoutMs = 120000, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      await execPromise(
        `curl -sSL --max-time ${Math.round(timeoutMs / 1000)} -o "${dest}" "${url}"`,
        { timeout: timeoutMs + 20000 }
      );
      const st = fs.statSync(dest);
      if (st.size > 30000) return true;
      console.log(`   🖼️  aithumb: download too small (${st.size}b) — retry ${i + 1}`);
    } catch (e) {
      console.log(`   🖼️  aithumb: attempt ${i + 1} failed: ${e.message.slice(0, 80)}`);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return false;
}

function hookWordsFor(topic) {
  return topic.title.replace(/#shorts/i, '')
    .split(' ').filter(w => !['The', 'A', 'An'].includes(w))
    .slice(0, 3).join(' ').toUpperCase();
}

/**
 * Returns outPath on success, null on any failure (caller falls back).
 */
async function buildAiThumb(topic, hookWords, outPath) {
  try {
    const url = thumbUrl(topic);
    console.log(`   🖼️  AI thumb: "${buildPrompt(topic).slice(0, 100)}..."`);
    const raw = outPath.replace(/\.jpg$/i, '_ai_raw.jpg');
    const ok = await download(url, raw);
    if (!ok) return null;
    // Pollinations stamps a small corner watermark even with nologo=true —
    // crop the bottom 70px where it always sits.
    await execPromise(
      `python3 -c "from PIL import Image; im=Image.open('${raw}'); w,h=im.size; im.crop((0,0,w,h-70)).save('${raw}')"`,
      { timeout: 30000 }
    );
    const hook = (hookWords || hookWordsFor(topic)).replace(/"/g, '');
    await execPromise(
      `python3 "${path.join(HU, 'aithumb_text.py')}" "${raw}" "${outPath}" "${hook}"`,
      { timeout: 90000 }
    );
    fs.unlink(raw, () => {});
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 30000) return null;
    console.log(`   🖼️  AI thumb OK -> ${outPath}`);
    return outPath;
  } catch (e) {
    console.log(`   ⚠️  AI thumb failed (using frame fallback): ${e.message.slice(0, 90)}`);
    return null;
  }
}

/**
 * Shared helper: AI thumb first, thumb.py frame fallback. Never throws —
 * worst case returns null and the caller skips the thumbnail.
 */
async function makeThumbnail({ topic, mp4Path, outPath, hookWords }) {
  const hook = hookWords || hookWordsFor(topic);
  try {
    const ai = await buildAiThumb(topic, hook, outPath);
    if (ai) return ai;
  } catch (e) {
    console.log(`   ⚠️  AI thumb error: ${e.message.slice(0, 80)}`);
  }
  try {
    console.log('   🖼️  falling back to frame thumbnail (thumb.py)...');
    await execPromise(
      `python3 "${path.join(HU, 'thumb.py')}" "${mp4Path}" "${outPath}" "${hook.replace(/"/g, '')}"`,
      { timeout: 90000 }
    );
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) return outPath;
  } catch (e) {
    console.log(`   ⚠️  frame thumb failed too: ${e.message.slice(0, 80)}`);
  }
  return null;
}

module.exports = { buildAiThumb, makeThumbnail, hookWordsFor, buildPrompt, thumbUrl };
