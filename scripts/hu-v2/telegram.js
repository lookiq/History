/**
 * hu-v2 telegram delivery — sends finished Short + metadata to Md's Telegram.
 * Uses curl multipart (no extra deps). Bot API 50MB file limit.
 */
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function enabled() { return !!(TOKEN && CHAT_ID); }

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
      `--data-urlencode chat_id="${CHAT_ID}" --data-urlencode text="${c.replace(/"/g, "'")}"`;
    const { stdout } = await execPromise(cmd);
    const res = JSON.parse(stdout);
    if (!res.ok) throw new Error('Telegram sendMessage failed: ' + stdout.slice(0, 200));
  }
}

async function deliver({ videoPath, title, description, topicId }) {
  if (!enabled()) {
    console.log('   📱 Telegram not configured — skipping');
    return false;
  }
  console.log('   📱 Sending video to Telegram...');
  await sendVideo(videoPath, `🎬 ${title}`);
  await sendMessage(`📝 *${title}*\n\n${description}`);
  console.log('   ✅ Telegram delivery done');
  return true;
}

module.exports = { deliver, enabled };
