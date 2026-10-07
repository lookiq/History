/**
 * hu-v2 telegram delivery — sends finished Short + metadata to Md's Telegram.
 * Uses curl multipart (no extra deps). Bot API 50MB file limit.
 *
 * Bot/chat resolution is parameterized: the dedicated SciBytes bot secrets
 * (SCIBYTES_TELEGRAM_BOT_TOKEN / SCIBYTES_TELEGRAM_CHAT_ID) take precedence,
 * falling back to the original TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.
 * hu-v2 workflows only set the original names, so History Uncut behavior is
 * completely unchanged.
 */
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

const TOKEN = process.env.SCIBYTES_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.SCIBYTES_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
const MAX_TG_BYTES = 45 * 1024 * 1024; // Bot API limit is 50MB — stay safely under

function enabled() { return !!(TOKEN && CHAT_ID); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Retry a Telegram send with exponential backoff (Md's rule: if a send fails,
 * check and try again until it succeeds — never silently drop a delivery).
 * Each message is retried individually so a later failure never duplicates
 * an earlier, already-delivered message. Honors Telegram 429 retry_after.
 */
async function withRetry(fn, label, maxAttempts = 6) {
  let delay = 10000; // start at 10s
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e.message || String(e);
      const m = msg.match(/retry_after[^0-9]*([0-9]+)/i);
      if (m) delay = Math.max(delay, parseInt(m[1], 10) * 1000 + 5000);
      if (attempt === maxAttempts) {
        throw new Error(`${label} failed after ${maxAttempts} attempts: ${msg.slice(0, 160)}`);
      }
      console.log(`   ⚠️ ${label} attempt ${attempt}/${maxAttempts} failed — retrying in ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
      delay = Math.min(delay * 2, 300000); // cap at 5 min between attempts
    }
  }
}

/** If video exceeds Telegram's limit, make a compressed copy (YouTube master untouched). */
async function fitForTelegram(videoPath) {
  const size = fs.statSync(videoPath).size;
  if (size <= MAX_TG_BYTES) return videoPath;
  console.log(`   📱 Video ${(size / 1048576).toFixed(0)}MB > 45MB — compressing copy for Telegram...`);
  const out = videoPath.replace(/\.mp4$/, '_tg.mp4');
  await execPromise(`ffmpeg -y -v error -i "${videoPath}" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "${out}"`);
  const s2 = fs.statSync(out).size;
  console.log(`   📱 Compressed: ${(s2 / 1048576).toFixed(0)}MB`);
  if (s2 > MAX_TG_BYTES) {
    // still too big: drop to 720p
    await execPromise(`ffmpeg -y -v error -i "${videoPath}" -vf "scale=720:1280" -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "${out}"`);
  }
  return out;
}

async function sendVideo(videoPath, caption) {
  const cap = caption.slice(0, 1000);
  const cmd = `curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendVideo" ` +
    `-F chat_id="${CHAT_ID}" -F supports_streaming=true ` +
    `-F caption="${cap.replace(/"/g, '')}" -F video=@"${videoPath}"`;
  const { stdout } = await execPromise(cmd, { maxBuffer: 5 * 1024 * 1024 });
  const res = JSON.parse(stdout);
  if (!res.ok) throw new Error('Telegram sendVideo failed: ' + stdout.slice(0, 200));
  return res.result.message_id;
}

async function sendMessage(text) {
  // split long messages at 4000 chars
  const chunks = [];
  let t = text;
  while (t.length > 4000) {
    let i = t.lastIndexOf('\n', 4000);
    if (i < 0) i = 4000;
    chunks.push(t.slice(0, i));
    t = t.slice(i);
  }
  chunks.push(t);
  for (const c of chunks) {
    const cmd = `curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" ` +
      `--data-urlencode chat_id="${CHAT_ID}" --data-urlencode parse_mode="Markdown" --data-urlencode text="${c.replace(/"/g, "'")}"`;
    const { stdout } = await execPromise(cmd);
    const res = JSON.parse(stdout);
    if (!res.ok) throw new Error('Telegram sendMessage failed: ' + stdout.slice(0, 200));
  }
}

async function sendPhoto(photoPath, caption) {
  const cap = (caption || '').slice(0, 1000);
  const cmd = `curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendPhoto" ` +
    `-F chat_id="${CHAT_ID}" ` +
    `-F caption="${cap.replace(/"/g, '')}" -F photo=@"${photoPath}"`;
  const { stdout } = await execPromise(cmd, { maxBuffer: 5 * 1024 * 1024 });
  const res = JSON.parse(stdout);
  if (!res.ok) throw new Error('Telegram sendPhoto failed: ' + stdout.slice(0, 200));
  return res.result.message_id;
}

/**
 * Md's standing copy-paste format: every piece arrives as its own clean,
 * separately-copyable block — title, description (body+hashtags+Tags),
 * pinned comment, focus keyword, music, playlist, thumbnail, upload checklist.
 */

/**
 * Generic upload checklist (mirrors the manual-delivery packs):
 * title pasted exactly, one-block description, pinned comment, caption check,
 * music-at-upload reminder, visibility settings, end-screen routine.
 */
function uploadChecklist({ title, music }) {
  const lines = [
    `Title pasted exactly: "${title}"`,
    'Description + hashtags + tags pasted as one block',
    'Pinned comment posted after upload',
    'Captions verified on-device (gold karaoke syncs to voiceover)',
  ];
  if (music) lines.push(`Music added at upload: ${music} (NOT baked into the video)`);
  lines.push(
    'Visibility: Public | Audience: Not made for kids | Shorts remix: Allow',
    'End screen / related Short pinned per channel routine'
  );
  return lines.map(l => '• ' + l).join('\n');
}

async function deliver({ videoPath, title, description, topicId, music, playlist,
                         thumbnailPath, batchLabel, pinnedComment, focusKeyword, checklist,
                         tags }) {
  if (!enabled()) {
    console.log('   📱 Telegram not configured — skipping');
    return false;
  }
  const label = batchLabel ? ` [${batchLabel}]` : '';
  const code = (t) => '```\n' + String(t).replace(/```/g, "'''") + '\n```';

  console.log('   📱 Sending video to Telegram...');
  const sendPath = await fitForTelegram(videoPath);
  try {
    await withRetry(() => sendVideo(sendPath, `${title}${label}`), 'sendVideo');
  } finally {
    if (sendPath !== videoPath) fs.unlink(sendPath, () => {}); // clean compressed copy
  }

  await withRetry(() => sendMessage(`📋 *Title — tap to copy:*${label}\n${code(title)}`), 'title message');
  await withRetry(() => sendMessage(`📝 *Description — tap to copy:*\n${code(description)}`), 'description message');
  if (tags) await withRetry(() => sendMessage(`🏷️ *Tags — tap to copy:*\n${code(tags)}`), 'tags message');
  if (pinnedComment) await withRetry(() => sendMessage(`📌 *Pinned comment:*\n${pinnedComment}`), 'pinned comment');
  if (focusKeyword) await withRetry(() => sendMessage(`🎯 *Focus keyword:* ${focusKeyword}`), 'focus keyword');
  if (music) await withRetry(() => sendMessage(`🎵 *Music:*\n${music}\n_YouTube Audio Library — add at upload time_`), 'music suggestion');
  if (playlist) await withRetry(() => sendMessage(`🗂️ *Playlist:*\n${playlist}`), 'playlist');
  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    try {
      await withRetry(() => sendPhoto(thumbnailPath, `🖼️ Thumbnail${label}`), 'thumbnail', 3);
    } catch (e) {
      console.log('   ⚠️ thumbnail send failed: ' + e.message.slice(0, 80));
    }
  }
  if (checklist) await withRetry(() => sendMessage(`✅ *Upload checklist:*${label}\n${code(checklist)}`), 'upload checklist');
  console.log('   ✅ Telegram delivery done');
  return true;
}

module.exports = { deliver, enabled, uploadChecklist };
