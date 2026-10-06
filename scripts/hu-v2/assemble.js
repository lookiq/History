/**
 * hu-v2 assemble — Four Chaplains composite (built at 720x1280, upscaled to 1080x1920):
 *   top 60%: Ken Burns/archive montage | bottom 40%: branded panel + gold karaoke
 */
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function assemble({ clips, panelPng, assPath, voiceMp3, outPath, totalSecs }) {
  const n = clips.length;
  const inputs = clips.map(c => `-i "${c}"`).join(' ');
  let fc = '';
  clips.forEach((_, i) => {
    fc += `[${i}:v]scale=720:770:force_original_aspect_ratio=increase,crop=720:770,setsar=1,fps=30[v${i}];`;
  });
  fc += clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[vm];`;
  fc += `[vm][${n}:v]vstack=inputs=2[vcat];`;
  // subtitles -> film grain + vignette -> upscale to 1080x1920 (uploader requires full-bleed)
  fc += `[vcat]subtitles='${assPath.replace(/'/g, "'\\\\''")}':fontsdir='${path.dirname(assPath).replace(/'/g, "'\\\\''")}',noise=alls=5:allf=t,vignette=PI/6,scale=1080:1920:flags=lanczos[vout]`;

  const cmd = `ffmpeg -y -v error ${inputs} -loop 1 -i "${panelPng}" -i "${voiceMp3}" ` +
    `-filter_complex "${fc}" -map "[vout]" -map "${n + 1}:a" ` +
    `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -t ${totalSecs} -shortest "${outPath}"`;
  await execPromise(cmd);
  return outPath;
}

module.exports = { assemble };
