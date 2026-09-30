const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('data/videos').filter(f => f.endsWith('.mp4')).slice(-6);
console.log('Checking last 6 videos:');

for (const f of files) {
  const p = path.join('data/videos', f);
  for (const s of [3, 12, 22, 35]) {
    const testJpg = path.join('temp', `test_${f.replace('.mp4','')}_${s}.jpg`);
    try {
      execSync(`ffmpeg -y -ss ${s} -i "${p}" -vframes 1 "${testJpg}"`, { stdio: 'pipe' });
      // Crop only the middle video area (between Y=560 and Y=1380, width 1080, height 820)
      const croppedJpg = path.join('temp', `crop_${f.replace('.mp4','')}_${s}.jpg`);
      execSync(`ffmpeg -y -i "${testJpg}" -vf "crop=1080:750:0:580" "${croppedJpg}"`, { stdio: 'pipe' });
      
      // Calculate average brightness/color with signalstats or ffprobe
      const stats = execSync(`ffprobe -v error -f lavfi -i "movie=${croppedJpg.replace(/\\/g, '/')},signalstats" -show_entries frame_tags=LAVFI.SIGNALSTATS.YAVG -of default=noprint_wrappers=1:nokey=1`, { encoding: 'utf8' }).trim();
      console.log(`${f} @ ${s}s: middle_YAVG_brightness=${stats} (file size: ${fs.statSync(croppedJpg).size})`);
    } catch (e) {
      console.log(`${f} @ ${s}s: error: ${e.message}`);
    }
  }
}
