const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const video = path.join(__dirname, '..', 'data', 'videos', 'master_short_1790515514886.mp4');
const outDir = path.join(__dirname, '..', 'temp', 'frame_check');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Inspecting video:', video);
for (let i = 2; i <= 44; i += 4) {
  const outFile = path.join(outDir, `frame_${i}.jpg`);
  try {
    execSync(`ffmpeg -y -ss ${i} -i "${video}" -vframes 1 -q:v 2 "${outFile}"`, { stdio: 'pipe' });
    const size = fs.statSync(outFile).size;
    console.log(`Sec ${i}: extracted (${size} bytes)`);
  } catch (err) {
    console.error(`Sec ${i} error:`, err.message);
  }
}
