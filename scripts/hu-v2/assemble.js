/**
 * hu-v2 assemble — MASTER TEMPLATE composite (100% match to
 * assets/templates/master_history_uncut_template.png, 1080x1920):
 *   Y 0..240    : header (logo + The History Uncut + @HistoryUncutUS) — baked in template
 *   Y 240..300  : context line (ASS Context style, per-video)
 *   Y 300..1020 : video window 1080x720 — montage fills the "red box"
 *   Y 1020..1440: caption area — gold laurels + karaoke (ASS Karaoke style)
 *   Y 1440..1580: CTA — subscribe pill — baked in template, REVEALED ONLY IN LAST 5s
 *   Y 1580..1920: safe bottom — baked in template
 * No baked-in music (Md adds the suggested track at upload time).
 * CTA rule (Md 2026-10-06): subscribe pill appears ONLY in the final 5 seconds.
 */
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'assets', 'templates', 'master_history_uncut_template.png');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
// video window ("red box" in Md's screenshot)
const VW = { x: 0, y: 300, w: 1080, h: 720 };
// CTA strip hidden until the last CTA_SECS seconds
const CTA = { y: 1460, h: 120 };
const CTA_SECS = 5;

async function assemble({ clips, assPath, voiceMp3, outPath, totalSecs }) {
  const n = clips.length;
  const inputs = clips.map(c => `-i "${c}"`).join(' ');
  let fc = '';
  clips.forEach((_, i) => {
    // Fit (never crop content): full frame scaled to fit the window, over a
    // blurred fill of itself — Md 2026-10-07: the old center-crop chopped
    // heads/action off archival footage ("crop hoyce vhul jaigai").
    fc += `[${i}:v]split=2[bs${i}][fs${i}];` +
      `[bs${i}]scale=${VW.w}:${VW.h}:force_original_aspect_ratio=increase,` +
      `crop=${VW.w}:${VW.h},boxblur=20:3,setsar=1,fps=30[bg${i}];` +
      `[fs${i}]scale=${VW.w}:${VW.h}:force_original_aspect_ratio=decrease,` +
      `setsar=1,fps=30[fg${i}];` +
      `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2[v${i}];`;
  });
  fc += clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[vm];`;
  // template split: base (CTA painted out) + CTA strip (revealed at the end)
  fc += `[${n}:v]split=2[tmplA][tmplB];`;
  fc += `[tmplA]format=yuv420p,drawbox=x=0:y=${CTA.y}:w=1080:h=${CTA.h}:color=0x0d0b07:t=fill[base];`;
  fc += `[tmplB]crop=1080:${CTA.h}:0:${CTA.y},format=yuv420p[cta];`;
  fc += `[base][vm]overlay=${VW.x}:${VW.y}[vvid];`;
  fc += `[vvid][cta]overlay=0:${CTA.y}:enable='gte(t,${totalSecs - CTA_SECS})'[vcta];`;
  // karaoke + context line (context stays full duration; CTA pill appears only at end)
  const assEsc = assPath.replace(/'/g, "'\\\\''");
  fc += `[vcta]ass='${assEsc}':fontsdir='${FONTS_DIR}'[vsub];`;
  // subtle cohesion: film grain + gentle vignette
  fc += `[vsub]noise=alls=5:allf=t,vignette=PI/7,format=yuv420p[vout]`;

  const cmd = `ffmpeg -y -v error ${inputs} -loop 1 -i "${TEMPLATE}" -i "${voiceMp3}" ` +
    `-filter_complex "${fc}" -map "[vout]" -map "${n + 1}:a" ` +
    `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k ` +
    `-t ${totalSecs} -shortest "${outPath}"`;
  await execPromise(cmd, { maxBuffer: 50 * 1024 * 1024 });
  return outPath;
}

module.exports = { assemble };
