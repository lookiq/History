/**
 * hu-v2 batch schedule summary — sent once after the daily 3-video batch.
 * Reads the batch manifest written by direct.js and tells Md exactly when
 * to schedule each video on YouTube (US dayparts, expressed in Dhaka time).
 */
const fs = require('fs');
const path = require('path');

const MANIFEST = process.env.HU_BATCH_MANIFEST ||
  path.join(__dirname, '..', '..', 'data', 'hu_v2_work', 'batch_manifest.json');

// US-optimized slots, expressed ONLY in Dhaka time (batch lands ~8:15 AM Dhaka).
// Md copies these straight into YouTube's scheduler — no US conversion shown.
const SLOTS = [
  { when: 'আজ সন্ধ্যা ৬টা' },
  { when: 'আজ রাত ১০টা' },
  { when: 'কাল ভোর ৬টা' },
];

async function main() {
  let man = [];
  try { man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) {
    console.log('   📅 no batch manifest — skipping schedule summary');
    return;
  }
  if (!man.length) { console.log('   📅 empty manifest — skipping'); return; }

  const lines = ['📅 *Posting schedule — 3 videos*\n',
    'সবগুলো এখন upload করে YouTube-এ Scheduled করে দাও:\n'];
  man.slice(0, 3).forEach((v, i) => {
    const slot = SLOTS[i] || SLOTS[SLOTS.length - 1];
    const tag = v.label ? `[${v.label}] ` : '';
    lines.push(`*${tag}${v.title}*`);
    lines.push(`→ 🕐 ${slot.when}\n`);
  });
  lines.push('_Tip: Shorts-এ schedule রাখলে algorithm প্রতিটাকে আলাদা push দেয়।_');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.log('   📅 Telegram not configured — skipping'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'Markdown' }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram send failed: ' + JSON.stringify(data).slice(0, 120));
  console.log('   📅 schedule summary sent');
  try { fs.unlinkSync(MANIFEST); } catch (e) {}
}

main().catch(e => { console.error('   ⚠️ schedule summary failed:', e.message.slice(0, 100)); });
