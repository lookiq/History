/**
 * sb-v2 batch schedule summary — sent once after the daily 2-video batch.
 * Reads the batch manifest written by direct.js and tells Md exactly when
 * to schedule each video on YouTube. SciBytes slot: 1 AM Dhaka (US evening
 * daypart), staggered across two nights.
 *
 * Uses the DEDICATED SciBytes bot secrets (SCIBYTES_TELEGRAM_BOT_TOKEN /
 * SCIBYTES_TELEGRAM_CHAT_ID) — never the History Uncut ones.
 */
const fs = require('fs');
const path = require('path');

const MANIFEST = process.env.SB_BATCH_MANIFEST ||
  path.join(__dirname, '..', '..', 'data', 'sb_v2_work', 'sb_batch_manifest.json');

// Videos land in Md's hands ~10 PM Dhaka; YouTube scheduling is staggered
// across the 1 AM Dhaka slot (SciBytes prime slot).
const SLOTS = [
  { when: 'আজ রাত ১টা' },   // video 1 -> tonight 1 AM Dhaka
  { when: 'কাল রাত ১টা' },  // video 2 -> tomorrow 1 AM Dhaka
];

async function main() {
  let man = [];
  try { man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) {
    console.log('   📅 no SciBytes batch manifest — skipping schedule summary');
    return;
  }
  if (!man.length) { console.log('   📅 empty manifest — skipping'); return; }

  const lines = ['📅 *SciBytes posting schedule — 2 videos*\n',
    'ভিডিও হাতে পেয়েছো রাত ১০টায় ✅ — এখন upload করে YouTube-এ Scheduled করে দাও:\n'];
  man.slice(0, 2).forEach((v, i) => {
    const slot = SLOTS[i] || SLOTS[SLOTS.length - 1];
    lines.push(`*${v.title}*`);
    lines.push(`→ 🕐 ${slot.when}\n`);
  });
  lines.push('_Tip: Shorts-এ schedule রাখলে algorithm প্রতিটাকে আলাদা push দেয়।_');

  const token = process.env.SCIBYTES_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.SCIBYTES_TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.log('   📅 Telegram not configured — skipping'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'Markdown' }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram send failed: ' + JSON.stringify(data).slice(0, 120));
  console.log('   📅 SciBytes schedule summary sent');
  try { fs.unlinkSync(MANIFEST); } catch (e) {}
}

main().catch(e => { console.error('   ⚠️ schedule summary failed:', e.message.slice(0, 100)); });
