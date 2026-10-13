/**
 * Manual delivery sender — Md's exact format (2026-10-13):
 *   video -> thumbnail -> title -> description -> tags -> pinned comment
 * No extra text, no headings — full copy-paste format (each text block
 * wrapped in triple backticks so Telegram shows tap-to-copy).
 *
 * Usage: node scripts/hu-v2/send_manual.js <bundle.json>
 * bundle.json: { video, thumbnail, title, description, tags, pinnedComment }
 * (paths relative to repo root)
 *
 * Standalone on purpose: does not touch telegram.js, so the pipeline's
 * deliver() behavior is completely unchanged.
 */
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const execPromise = util.promisify(exec);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_TG_BYTES = 45 * 1024 * 1024; // Bot API limit is 50MB — stay safely under

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, label, maxAttempts = 6) {
  let delay = 10000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e.message || String(e);
      const m = msg.match(/retry_after[^0-9]*([0-9]+)/i);
      if (m) delay = Math.max(delay, parseInt(m[1], 10) * 1000 + 5000);
      if (attempt === maxAttempts) throw new Error(`${label} failed after ${maxAttempts} attempts: ${msg.slice(0, 160)}`);
      console.log(`   WARN ${label} attempt ${attempt}/${maxAttempts} failed — retrying in ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
      delay = Math.min(delay * 2, 300000);
    }
  }
}

async function fitForTelegram(videoPath) {
  const size = fs.statSync(videoPath).size;
  if (size <= MAX_TG_BYTES) return videoPath;
  console.log(`   video ${(size / 1048576).toFixed(0)}MB > 45MB — compressing copy for Telegram...`);
  const out = videoPath.replace(/\.mp4$/, '_tg.mp4');
  await execPromise(`ffmpeg -y -v error -i "${videoPath}" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "${out}"`);
  return out;
}

async function sendVideo(videoPath) {
  const sendPath = await fitForTelegram(videoPath);
  const cmd = `curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendVideo" ` +
    `-F chat_id="${CHAT_ID}" -F supports_streaming=true -F video=@"${sendPath}"`;
  const { stdout } = await execPromise(cmd, { maxBuffer: 5 * 1024 * 1024 });
  const res = JSON.parse(stdout);
  if (!res.ok) throw new Error('Telegram sendVideo failed: ' + stdout.slice(0, 200));
}

async function sendPhoto(photoPath) {
  const cmd = `curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendPhoto" ` +
    `-F chat_id="${CHAT_ID}" -F photo=@"${photoPath}"`;
  const { stdout } = await execPromise(cmd, { maxBuffer: 5 * 1024 * 1024 });
  const res = JSON.parse(stdout);
  if (!res.ok) throw new Error('Telegram sendPhoto failed: ' + stdout.slice(0, 200));
}

async function sendCodeBlock(text) {
  // Plain triple-backtick block, no heading — Md's copy-paste format.
  // Written via temp file so backticks never break /bin/sh parsing.
  const body = '```\n' + text + '\n```';
  const t = body.length > 4000 ? body.slice(0, 4000) : body;
  const tmp = path.join(os.tmpdir(), `tgmanual-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(tmp, t, 'utf8');
  try {
    const cmd = `curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" ` +
      `--data-urlencode chat_id="${CHAT_ID}" --data-urlencode text@${tmp}`;
    const { stdout } = await execPromise(cmd);
    const res = JSON.parse(stdout);
    if (!res.ok) throw new Error('Telegram sendMessage failed: ' + stdout.slice(0, 200));
  } finally {
    fs.unlink(tmp, () => {});
  }
}

async function main() {
  if (!TOKEN || !CHAT_ID) throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
  const bundlePath = process.argv[2];
  if (!bundlePath) throw new Error('usage: node scripts/hu-v2/send_manual.js <bundle.json>');
  const b = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const root = path.resolve(__dirname, '..', '..');
  const video = path.join(root, b.video);
  const thumb = b.thumbnail ? path.join(root, b.thumbnail) : null;
  if (!fs.existsSync(video)) throw new Error('video not found: ' + b.video);

  console.log('manual delivery: ' + (b.title || b.video));
  await withRetry(() => sendVideo(video), 'video');
  console.log('  video sent');
  if (thumb && fs.existsSync(thumb)) {
    await withRetry(() => sendPhoto(thumb), 'thumbnail', 3);
    console.log('  thumbnail sent');
  } else {
    console.log('  (no thumbnail — skipped)');
  }
  // Exact order, no headings, no extra text:
  await withRetry(() => sendCodeBlock(b.title), 'title');
  await withRetry(() => sendCodeBlock(b.description), 'description');
  if (b.tags) await withRetry(() => sendCodeBlock(b.tags), 'tags');
  if (b.pinnedComment) await withRetry(() => sendCodeBlock(b.pinnedComment), 'pinned comment');
  console.log('manual delivery done');
}

main().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
