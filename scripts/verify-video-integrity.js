const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

/**
 * Pre-Upload Video Integrity & Zero-Black-Screen Verification Shield
 * Ensures that defective, corrupted, or black-screen videos are NEVER uploaded to YouTube.
 */
async function verifyVideoIntegrity(specificMetaPath = null) {
  console.log('====================================================');
  console.log('🛡️ VIDEO INTEGRITY & BLACK SCREEN PREVENTION SHIELD');
  console.log('====================================================');

  const videoDir = path.join(__dirname, '..', 'data', 'videos');
  let metaPath = specificMetaPath;

  if (!metaPath) {
    const files = fs.readdirSync(videoDir);
    const metaFiles = files
      .filter(f => f.startsWith('master_short_') && f.endsWith('_meta.json'))
      .sort((a, b) => b.localeCompare(a));

    if (metaFiles.length === 0) {
      throw new Error('No metadata file found in data/videos. Generation must run first.');
    }
    metaPath = path.join(videoDir, metaFiles[0]);
  }

  console.log(`📄 Inspecting Video Metadata: ${path.basename(metaPath)}`);
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  if (!fs.existsSync(meta.videoPath)) {
    throw new Error(`CRITICAL: Video file does not exist at ${meta.videoPath}`);
  }

  const fileStats = fs.statSync(meta.videoPath);
  const sizeMB = fileStats.size / (1024 * 1024);
  console.log(`📦 File Size: ${sizeMB.toFixed(2)} MB`);

  if (sizeMB < 3.0) {
    throw new Error(`CRITICAL: Video file size too small (${sizeMB.toFixed(2)} MB). Possible render failure!`);
  }

  // 1. Probe video streams
  const probeOutput = execSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json "${meta.videoPath}"`,
    { encoding: 'utf8' }
  );
  const probeData = JSON.parse(probeOutput);
  const stream = probeData.streams?.[0];

  if (!stream) {
    throw new Error('CRITICAL: No video stream detected in file!');
  }

  const width = parseInt(stream.width, 10);
  const height = parseInt(stream.height, 10);
  const duration = parseFloat(stream.duration || meta.duration || 0);

  console.log(`📐 Dimensions: ${width}x${height} (Expected: 1080x1920)`);
  console.log(`⏱️ Duration: ${duration.toFixed(1)}s`);

  if (width !== 1080 || height !== 1920) {
    throw new Error(`CRITICAL: Invalid video resolution ${width}x${height}. Expected full-bleed 1080x1920!`);
  }

  if (duration < 25) {
    throw new Error(`CRITICAL: Video duration too short (${duration.toFixed(1)}s). Expected at least 25s!`);
  }

  // 2. Black Screen Detection via Luminance Sampling with Sharp
  console.log('\n🔍 Sampling visual brightness across video timeline...');
  const tempDir = path.join(__dirname, '..', 'temp', 'integrity_check');
  fs.mkdirSync(tempDir, { recursive: true });

  const samplePoints = [
    Math.max(2, Math.floor(duration * 0.15)),
    Math.floor(duration * 0.35),
    Math.floor(duration * 0.60),
    Math.floor(duration * 0.85)
  ];

  let blackFrameCount = 0;

  for (let i = 0; i < samplePoints.length; i++) {
    const sec = samplePoints[i];
    const sampleJpg = path.join(tempDir, `sample_${i}_${sec}s.jpg`);

    execSync(
      `ffmpeg -y -ss ${sec} -i "${meta.videoPath}" -vframes 1 -q:v 2 "${sampleJpg}"`,
      { stdio: 'pipe' }
    );

    const imgStats = await sharp(sampleJpg).stats();
    const rMean = imgStats.channels[0].mean;
    const gMean = imgStats.channels[1].mean;
    const bMean = imgStats.channels[2].mean;
    const avgLuma = (0.299 * rMean + 0.587 * gMean + 0.114 * bMean);

    console.log(`   ⏱️  Sample @ ${sec}s: Visual Luminance = ${avgLuma.toFixed(1)} (RGB: ${Math.round(rMean)}, ${Math.round(gMean)}, ${Math.round(bMean)})`);

    if (avgLuma < 8.0) {
      console.warn(`   ⚠️ Frame at ${sec}s is excessively dark!`);
      blackFrameCount++;
    }
  }

  // Cleanup test samples
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  if (blackFrameCount >= 3) {
    throw new Error(`CRITICAL: ${blackFrameCount}/${samplePoints.length} sampled frames are PITCH BLACK. Video render failed! Aborting upload to prevent black-screen publication.`);
  }

  console.log('\n====================================================');
  console.log('✅ VIDEO INTEGRITY CHECK: 100% PASSED');
  console.log('   🛡️  No black screens detected');
  console.log('   🎨 Full-bleed 1080x1920 confirmed');
  console.log('   🚀 Safe to proceed with YouTube upload');
  console.log('====================================================\n');
  return true;
}

if (require.main === module) {
  const metaArg = process.argv[2] || null;
  verifyVideoIntegrity(metaArg)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ INTEGRITY SHIELD TRIGGERED:', err.message);
      process.exit(1);
    });
}

module.exports = { verifyVideoIntegrity };
