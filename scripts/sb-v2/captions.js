/**
 * sb-v2 captions — SciBytes locked caption style (Md 2026-10-07):
 *   DejaVu Sans Bold, ALL CAPS, white fill + thick black outline,
 *   CYAN/electric-blue karaoke highlight (ASS SecondaryColour &H00FFFF00 —
 *   NEVER yellow, yellow is Factify's), word-level \k karaoke,
 *   max 4-5 words per line, 2 lines max, lower third (Alignment 2)
 *   positioned above the pill zone (pill sits just BELOW the caption block).
 */
const fs = require('fs');

const FONT = 'DejaVu Sans';
// Lower-third: bottom margin keeps captions clear of the pill zone.
// Pill is overlaid just below the caption block in the final 5s.
const MARGIN_V = 300;

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60), cs = Math.floor((s % 1) * 100);
  return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildAss(words, outPath, totalSecs) {
  const lines = [];
  // chunk words into caption lines: 4-5 words per line, 2 lines max per event
  let cur = [], events = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 5) { events.push(cur); cur = []; }
  }
  if (cur.length) events.push(cur);
  // pair lines into 2-line events
  const grouped = [];
  for (let i = 0; i < events.length; i += 2) grouped.push(events.slice(i, i + 2));

  const header =
`[Script Info]
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SciBytes,${FONT},76,&H00FFFFFF,&H00FFFF00,&H00000000,&H80000000,-1,0,0,0,100,100,1.5,0,1,4.5,1.5,2,60,60,${MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const ev of grouped) {
    const first = ev[0][0], last = ev[ev.length - 1][ev[ev.length - 1].length - 1];
    const start = Math.max(0, first.s - 0.05);
    const end = Math.min(totalSecs, last.e + 0.08);
    const textLines = ev.map(lineWords =>
      lineWords.map(w => {
        const k = Math.max(1, Math.round((w.e - w.s) * 100));
        const clean = String(w.w).toUpperCase().replace(/[{}\\]/g, '');
        return `{\\k${k}}${clean}`;
      }).join(' ')
    );
    lines.push(`Dialogue: 0,${fmtTime(start)},${fmtTime(end)},SciBytes,,0,0,0,,${textLines.join('\\N')}`);
  }

  fs.writeFileSync(outPath, header + lines.join('\n') + '\n');
  return { lines: lines.length, marginV: MARGIN_V };
}

module.exports = { buildAss, MARGIN_V };
