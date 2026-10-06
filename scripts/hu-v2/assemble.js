/**
 * hu-v2 assemble — MASTER TEMPLATE composite (100% match to
 * assets/templates/master_history_uncut_template.png, 1080x1920):
 *   Y 0..240    : header (logo + The History Uncut + @HistoryUncutUS) — baked in template
 *   Y 240..300  : context line (ASS Context style, per-video)
 *   Y 300..1020 : video window 1080x720 — montage fills the "red box"
 *   Y 1020..1440: caption area — gold laurels + karaoke (ASS Karaoke style)
 *   Y 1440..1580: CTA — subscribe pill — baked in template
 *   Y 1580..1920: safe bottom — baked in template
 * No baked-in music (Md adds the suggested track at upload time).
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

async function assemble({ clips, assPath, voiceMp3, outPath, totalSecs }) {
  const n = clips.length;
  const inputs = clips.map(c => `-i "${c}"`).join(' ');
  let fc = '';
  clips.forEach((_, i) => {
    fc += `[${i}:v]scale=${VW.w}:${VW.h}:force_original_aspect_ratio=increase,` +
      `crop=${VW.w}:${VW.h},setsar=1,fps=30[v${i}];`;
  });
  fc += clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[vm];`;
  // master template as base, montage into the video window
  fc += `[${n}:v]format=yuv420p[base];`;
  fc += `[base][vm]overlay=${VW.x}:${VW.y}[vvid];`;
  // karaoke + context line
  const assEsc = assPath.replace(/'/g, "'\\\\''");
  fc += `[vvid]ass='${assEsc}':fontsdir='${FONTS_DIR}'[vsub];`;
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
