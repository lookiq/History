const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('data/videos').filter(f => f.endsWith('.mp4'));
console.log(`Scanning ${files.length} videos in data/videos...`);

for (const f of files) {
  const p = path.join('data/videos', f);
  const outJpg = path.join('temp', `check_${f}.jpg`);
  const cropJpg = path.join('temp', `crop_check_${f}.jpg`);
  try {
    execSync(`ffmpeg -y -ss 5 -i "${p}" -vframes 1 "${outJpg}"`, { stdio: 'pipe' });
    execSync(`ffmpeg -y -i "${outJpg}" -vf "crop=1080:600:0:650" "${cropJpg}"`, { stdio: 'pipe' });
    const stats = execSync(`ffprobe -v error -f lavfi -i "movie=${cropJpg.replace(/\\/g, '/')},signalstats" -show_entries frame_tags=LAVFI.SIGNALSTATS.YAVG -of default=noprint_wrappers=1:nokey=1`, { encoding: 'utf8' }).trim();
    const yavg = parseFloat(stats);
    if (isNaN(yavg) || yavg < 25) {
      console.log(`🚨 BLACK/DARK VIDEO DETECTED: ${f} (YAVG: ${yavg})`);
    } else {
      console.log(`✅ ${f}: Normal video (YAVG: ${yavg})`);
    }
  } catch (err) {
    console.log(`⚠️ ${f}: Error - ${err.message}`);
  }
}
