/**
 * hu-v2 assemble — Four Chaplains composite, 720x1280:
 *   top 770px: Ken Burns montage | bottom 510px: branded panel + gold karaoke
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
  fc += `[vcat]subtitles='${assPath.replace(/'/g, "'\\\\''")}':fontsdir='${path.dirname(assPath).replace(/'/g, "'\\\\''")}'[vout]`;

  const cmd = `ffmpeg -y -v error ${inputs} -loop 1 -i "${panelPng}" -i "${voiceMp3}" ` +
    `-filter_complex "${fc}" -map "[vout]" -map "${n + 1}:a" ` +
    `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -t ${totalSecs} -shortest "${outPath}"`;
  await execPromise(cmd);
  return outPath;
}

module.exports = { assemble };
