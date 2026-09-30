require('dotenv').config();
const { generateFullBleedDocumentaryShort } = require('./generate-fullbleed-documentary-short');
const { verifyVideoIntegrity } = require('./verify-video-integrity');
const { uploadAndScheduleShort } = require('./upload-and-schedule-short');

/**
 * MASTER AUTONOMOUS CYCLE RUNNER
 * Fully executes the end-to-end automation in one unified pipeline:
 *  1. Deep Research & Full-Bleed Video Generation (Andrew voice + Branding + In-Pill Subtitles)
 *  2. Zero-Black-Screen Pre-Upload Integrity Verification
 *  3. Automated YouTube Studio Upload with Custom Thumbnail & SEO Tags
 */
async function runFullAutonomousCycle(customTopic = null, delayHours = 0) {
  console.log('================================================================');
  console.log('🚀 THE HISTORY UNCUT - FULL AUTONOMOUS EXECUTION PIPELINE');
  console.log('   🧠 Deep Forensic Research: WW1 / WW2 Outlier Events');
  console.log('   🎙️  American Andrew Voiceover: Boosted + Broadcast Compression');
  console.log('   🎨 Branding & Subscribe CTA In-Pill Captions: Active');
  console.log('   🛡️  Zero-Black-Screen Guardian Shield: Active');
  console.log('================================================================\n');

  // STEP 1: Generate Master Full-Bleed Short
  console.log('▶️ [STAGE 1/3] Generating Master Short with Full-Bleed Engine...');
  const shortMeta = await generateFullBleedDocumentaryShort(customTopic, {
    branding: true,
    voice: 'andrew'
  });
  console.log(`✅ [STAGE 1/3 COMPLETE] Video created: "${shortMeta.title}" (${shortMeta.duration}s)\n`);

  // STEP 2: Verify Video Integrity & Anti-Black-Screen Shield
  console.log('▶️ [STAGE 2/3] Auditing Video Integrity & Luminance...');
  const metadataPath = shortMeta.videoPath.replace('.mp4', '_meta.json');
  await verifyVideoIntegrity(metadataPath);
  console.log('✅ [STAGE 2/3 COMPLETE] Video integrity verified 100% healthy. No black screens.\n');

  // STEP 3: Automated YouTube Upload
  console.log(`▶️ [STAGE 3/3] Uploading Video to YouTube Channel (Delay: ${delayHours}h)...`);
  const uploadResult = await uploadAndScheduleShort(metadataPath, delayHours);
  console.log('\n================================================================');
  console.log('🎉 FULL AUTONOMOUS PIPELINE CYCLE COMPLETED SUCCESSFULLY!');
  console.log(`   🎥 Video ID:    ${uploadResult.videoId}`);
  console.log(`   🔗 Direct URL:  ${uploadResult.youtubeUrl}`);
  console.log('================================================================\n');

  return uploadResult;
}

if (require.main === module) {
  const topicArg = process.argv[2] || null;
  const delayArg = process.argv[3] !== undefined ? parseFloat(process.argv[3]) : 0;

  runFullAutonomousCycle(topicArg, delayArg)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ PIPELINE HALTED WITH ERROR:', err.message);
      process.exit(1);
    });
}

module.exports = { runFullAutonomousCycle };
