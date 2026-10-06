/**
 * hu-v2 karaoke captions — gold serif word-by-word, Four Chaplains panel style.
 * Input: word timings JSON [{w,s,e}]. Output: .ass file.
 * Panel zone: bottom ~40% of 720x1280 (y ~770-1280). Captions at y~880.
 */
const fs = require('fs');

function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60;
  const s = Math.floor(sec % 60), cs = Math.floor((sec % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildAss(words, outPath) {
  // Group into lines: max 5 words or 3.2s per line
  const lines = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const dur = cur[cur.length - 1].e - cur[0].s;
    if (cur.length >= 5 || dur >= 3.2) { lines.push(cur); cur = []; }
  }
  if (cur.length) lines.push(cur);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Karaoke,Cinzel,46,&H009966CC,&H0000D7FF,&H001A1A1A,&H90000000,-1,0,0,0,100,100,0.5,0,1,2.5,1,8,40,40,880,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  // PrimaryColour &H009966CC = dim gold (unspoken), SecondaryColour &H0000D7FF = bright gold (spoken, ASS is BBGGRR)
  const events = lines.map(line => {
    const start = line[0].s, end = line[line.length - 1].e + 0.15;
    let t = '', cursor = start;
    for (const w of line) {
      const lead = Math.max(0, Math.round((w.s - cursor) * 100));
      const dur = Math.max(5, Math.round((w.e - w.s) * 100));
      if (lead > 0) t += `{\\k${lead}} `;
      t += `{\\k${dur}}${w.w}`;
      cursor = w.e;
    }
    return `Dialogue: 0,${fmtTime(start)},${fmtTime(end)},Karaoke,,0,0,0,,${t}`;
  });

  fs.writeFileSync(outPath, header + events.join('\n') + '\n');
  return { lines: lines.length };
}

module.exports = { buildAss };
