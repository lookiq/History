require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { runFFmpeg, checkFFmpeg } = require('../utils/ffmpeg');
const { HistoryCardGenerator } = require('../utils/history-card-generator');

async function generateSampleShort() {
  console.log('--- 🎬 Generating History Bypass Style Sample Short ---');

  // Verify FFmpeg
  const ffmpegOk = await checkFFmpeg();
  if (!ffmpegOk) {
    throw new Error('FFmpeg is not available');
  }

  const outputDir = path.join(__dirname, '..', 'data', 'videos');
  await fs.mkdir(outputDir, { recursive: true });

  const tempDir = path.join(__dirname, '..', 'temp', 'test_render');
  await fs.mkdir(tempDir, { recursive: true });

  const width = 1080;
  const height = 1920;
  const duration = 5; // 5-second test video

  // 1. Create a historical sample background image (16:9)
  console.log('1. Generating sample historical scene image...');
  const sceneImagePath = path.join(tempDir, 'sample_scene.png');
  
  // Create an atmospheric historical canvas with dramatic lighting
  const sceneSvg = `
    <svg width="1080" height="820" viewBox="0 0 1080 820" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
          <stop offset="20%" stop-color="#1E293B" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#020617" stop-opacity="0.95"/>
        </radialGradient>
        <linearGradient id="warmLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#78350F"/>
          <stop offset="50%" stop-color="#1E1B4B"/>
          <stop offset="100%" stop-color="#09090B"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="820" fill="url(#warmLight)"/>
      <rect width="1080" height="820" fill="url(#vignette)"/>
      
      <!-- Historical Scene Silhouettes & Graphic Elements -->
      <circle cx="540" cy="320" r="190" fill="#F59E0B" opacity="0.15" />
      <text x="540" y="310" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="120" fill="#FACC15" opacity="0.9">⚔️ 🏛️ 👑</text>
      <text x="540" y="420" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="36" fill="#FFFFFF" letter-spacing="4px">THE ANCIENT EMPIRE</text>
    </svg>
  `;
  await sharp(Buffer.from(sceneSvg)).png().toFile(sceneImagePath);

  // 2. Generate the Top Card & Highlighted Text Overlay
  console.log('2. Generating History Bypass Card Overlay with colored hook...');
  const cardGenerator = new HistoryCardGenerator({
    channelName: process.env.CHANNEL_DISPLAY_NAME || 'The History Uncut',
    channelHandle: process.env.CHANNEL_HANDLE || '@HistoryUncutUS',
    avatarPath: path.join(__dirname, '..', 'assets', 'history_uncut_logo.png'),
    width: width,
    height: height
  });

  const hookText = 
    '[Bruce Lee|yellow] [secretly|cyan] used [cannabis|green]\n' +
    'during the [height|green] of his [fame.|yellow]\n' +
    'After his second [autopsy,|red]\n' +
    'his [doctor|cyan] tried to [attribute|yellow]\n' +
    'his cause of [death|red] to [Cannabis.|green]';
  const overlayPath = path.join(tempDir, 'history_card_overlay.png');
  
  const cardResult = await cardGenerator.renderCardOverlay(hookText, overlayPath);
  console.log(`   Overlay generated at: ${overlayPath}`);
  console.log(`   Video Y-offset: ${cardResult.videoY}px`);

  // 3. Render 9:16 MP4 video using FFmpeg with zoompan motion + card overlay
  const finalVideoPath = path.join(outputDir, 'test_history_bypass_short.mp4');
  console.log(`3. Rendering final 9:16 video to: ${finalVideoPath}...`);

  // Filter breakdown:
  // - Scene image with subtle slow zoom (Ken Burns effect)
  // - Pad/center into 1080x1920 black canvas at Y=cardResult.videoY
  // - Overlay the card PNG on top
  const filterComplex = 
    `[0:v]scale=1080:820,zoompan=z='min(zoom+0.0015,1.15)':d=${duration * 30}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x820:fps=30[zoomed];` +
    `color=c=black:s=${width}x${height}:d=${duration}:r=30[bg];` +
    `[bg][zoomed]overlay=(W-w)/2:${cardResult.videoY}[mid];` +
    `[mid][1:v]overlay=0:0:eof_action=repeat,fps=30,format=yuv420p[outv]`;

  await runFFmpeg([
    '-y',
    '-loop', '1', '-t', String(duration), '-i', sceneImagePath,
    '-loop', '1', '-t', String(duration), '-i', overlayPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-t', String(duration),
    finalVideoPath
  ]);

  // Check output
  const stats = await fs.stat(finalVideoPath);
  console.log(`\n🎉 SUCCESS! Rendered sample video: ${finalVideoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  return finalVideoPath;
}

if (require.main === module) {
  generateSampleShort()
    .then((p) => console.log('Completed successfully! Path:', p))
    .catch((err) => {
      console.error('Error generating short:', err);
      process.exit(1);
    });
}

module.exports = { generateSampleShort };
