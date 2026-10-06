/**
 * hu-v2 karaoke captions — MASTER TEMPLATE style (100% match to master_history_uncut_template.png).
 * PlayRes 1080x1920.
 * - Karaoke: Cinzel 54pt, ivory (#F4EFE2) unspoken -> antique gold (#F5C84C) spoken,
 *   max 3 words per phrase, top-center in caption area (y 1020..1440, start ~1140).
 * - Context: white DejaVu Sans 30pt, top-center just under header (y~252), full duration.
 */
const fs = require('fs');

function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60;
  const s = Math.floor(sec % 60), cs = Math.floor((sec % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildAss(words, outPath, totalSecs, contextLine) {
  // Karaoke phrases: max 3 words or 2.8s per phrase (master template spec)
  const lines = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const dur = cur[cur.length - 1].e - cur[0].s;
    if (cur.length >= 3 || dur >= 2.8) { lines.push(cur); cur = []; }
  }
  if (cur.length) lines.push(cur);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Karaoke,Cinzel,54,&H00E2EFF4,&H004CC8F5,&H00080706,&H90000000,-1,0,0,0,100,100,0.5,0,1,2,1,8,220,220,1140,1
Style: Context,DejaVu Sans,30,&H00FFFFFF,&H00FFFFFF,&H80000000,&H80000000,0,0,0,0,100,100,0,0,1,1.5,0,8,40,40,252,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
// PrimaryColour &H00E2EFF4 = ivory unspoken | SecondaryColour &H004CC8F5 = antique gold spoken (ASS BBGGRR)
  const events = lines.map(line => {
    const start = line[0].s, end = line[line.length - 1].e + 0.15;
    let t = '', cursor = start;
    line.forEach((w, idx) => {
      const lead = Math.max(0, Math.round((w.s - cursor) * 100));
      const dur = Math.max(5, Math.round((w.e - w.s) * 100));
      if (idx > 0) t += `{\\k${lead}} `;
      t += `{\\k${dur}}${w.w}`;
      cursor = w.e;
    });
    return `Dialogue: 0,${fmtTime(start)},${fmtTime(end)},Karaoke,,0,0,0,,${t}`;
  });

  // persistent context line under the header (e.g. "In 1944, Leo Major lost his left eye.")
  if (contextLine && contextLine.trim()) {
    const clean = contextLine.trim().replace(/\s+/g, ' ');
    events.unshift(`Dialogue: 0,0:00:00.00,${fmtTime(totalSecs)},Context,,0,0,0,,${clean}`);
  }

  fs.writeFileSync(outPath, header + events.join('\n') + '\n');
  return { lines: lines.length };
}

module.exports = { buildAss };
