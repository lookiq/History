require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const { generateHistoryUncutShort } = require('./generate-history-uncut-short');
const { uploadAndScheduleShort } = require('./upload-and-schedule-short');

/**
 * BATCH GENERATOR & MULTI-DAY USA SCHEDULER
 * 
 * Perfect workflow:
 * Generate 2 to 7 days worth of Hollywood-grade, copyright-shielded Shorts in one batch
 * while the PC is on.
 * Uploads all of them directly to YouTube Cloud Scheduled Queue.
 * Once uploaded, the PC can be SHUT DOWN, and YouTube auto-publishes at USA peak times!
 */
async function batchGenerateAndSchedule(videoCount = 3, intervalHours = 24) {
  console.log('====================================================');
  console.log('🚀 THE HISTORY UNCUT - MULTI-DAY BATCH SCHEDULER');
  console.log(`   📦 Video Batch Target: ${videoCount} videos`);
  console.log(`   ⏱️  Release Spacing:    Every ${intervalHours} hours (USA Golden Slots)`);
  console.log('   🛡️  All videos queued in YouTube Cloud — PC CAN BE SHUT DOWN!');
  console.log('====================================================\n');

  const scheduledResults = [];

  for (let i = 0; i < videoCount; i++) {
    const videoIndex = i + 1;
    // Calculate scheduled delay in hours
    // Video 1: 12h (or next slot), Video 2: 36h, Video 3: 60h...
    const delayHours = (i === 0) ? 12 : 12 + (i * intervalHours);
    const targetPublishDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);

    console.log(`\n----------------------------------------------------`);
    console.log(`🎬 [${videoIndex}/${videoCount}] GENERATING HIGH-QUALITY SHORT...`);
    console.log(`   🎯 Target Scheduled Slot: ${targetPublishDate.toLocaleString()} (in ${delayHours} hours)`);
    console.log(`----------------------------------------------------`);

    try {
      // 1. Generate video using the USA viral content matrix
      const generated = await generateHistoryUncutShort();
      console.log(`\n✅ Video ${videoIndex} generated successfully: "${generated.title}"`);

      // 2. Upload and schedule to YouTube Cloud
      console.log(`\n☁️  Uploading to YouTube Cloud with auto-schedule...`);
      const metaPath = generated.videoPath.replace('.mp4', '_meta.json');
      const uploadResult = await uploadAndScheduleShort(metaPath, delayHours);

      scheduledResults.push({
        index: videoIndex,
        title: generated.title,
        youtubeUrl: uploadResult.youtubeUrl,
        publishAt: uploadResult.publishAt,
        duration: generated.duration
      });

      console.log(`🎉 [${videoIndex}/${videoCount}] Queued in YouTube Cloud! URL: ${uploadResult.youtubeUrl}`);

      // Small 5s breathing pause between batch runs
      if (i < videoCount - 1) {
        console.log(`\n⏳ Cooling down 5s before next generation...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (err) {
      console.error(`\n❌ Error during batch item ${videoIndex}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 BATCH SCHEDULING COMPLETE!');
  console.log(`   Total Scheduled: ${scheduledResults.length}/${videoCount} videos queued in YouTube Cloud`);
  console.log('   💻 YOU CAN NOW SAFELY SHUT DOWN YOUR PC!');
  console.log('====================================================\n');

  console.table(scheduledResults.map(r => ({
    '#': r.index,
    'Title': r.title.substring(0, 35) + '...',
    'Scheduled For (Cloud)': new Date(r.publishAt).toLocaleString(),
    'Link': r.youtubeUrl
  })));

  return scheduledResults;
}

if (require.main === module) {
  const countArg = parseInt(process.argv[2], 10) || 3;
  const intervalArg = parseFloat(process.argv[3]) || 24;
  batchGenerateAndSchedule(countArg, intervalArg)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Batch failed:', err.message);
      process.exit(1);
    });
}

module.exports = { batchGenerateAndSchedule };
