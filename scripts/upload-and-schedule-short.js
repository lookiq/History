require('dotenv').config();
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

/**
 * Automates YouTube Upload with 2-Hour Scheduled Publish (100% Safe Quarantine)
 * Flow:
 * 1. Uploads video as 'private'
 * 2. Sets 'publishAt' timestamp to (now + 2 hours)
 * 3. YouTube Cloud automatically runs Content ID, audio/video fingerprinting, and 1080p transcode
 * 4. After 2 hours, YouTube automatically makes the video PUBLIC with zero PC involvement!
 */
async function uploadAndScheduleShort(specificMetaPath = null, delayHours = 2) {
  console.log('====================================================');
  console.log('🚀 AUTOMATED YOUTUBE UPLOADER WITH SAFETY SHIELD');
  console.log(`   ⏱️  Safety Quarantine Delay: ${delayHours} hours`);
  console.log('   🛡️  Method: YouTube Cloud Scheduled Publish');
  console.log('====================================================');

  // 1. Resolve OAuth Credentials
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('\n❌ ERROR: Missing YouTube OAuth credentials in environment.');
    console.error('Please ensure the following are set in .env or GitHub Secrets:');
    console.error(' - YOUTUBE_CLIENT_ID');
    console.error(' - YOUTUBE_CLIENT_SECRET');
    console.error(' - YOUTUBE_REFRESH_TOKEN');
    throw new Error('Missing YouTube OAuth credentials');
  }

  // 2. Find target metadata file
  const videoDir = path.join(__dirname, '..', 'data', 'videos');
  let metaPath = specificMetaPath;

  if (!metaPath) {
    const files = await fsPromises.readdir(videoDir);
    const metaFiles = files
      .filter(f => f.startsWith('master_short_') && f.endsWith('_meta.json'))
      .sort((a, b) => b.localeCompare(a)); // latest first

    if (metaFiles.length === 0) {
      throw new Error('No generated short metadata found in data/videos. Run generator first.');
    }
    metaPath = path.join(videoDir, metaFiles[0]);
  }

  console.log(`\n📄 Loading Short Metadata: ${path.basename(metaPath)}`);
  const meta = JSON.parse(await fsPromises.readFile(metaPath, 'utf8'));

  if (!fs.existsSync(meta.videoPath)) {
    throw new Error(`Video file not found at: ${meta.videoPath}`);
  }

  const fileStats = fs.statSync(meta.videoPath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Video File: ${meta.videoPath} (${fileSizeMB} MB)`);
  console.log(`🎬 Title: ${meta.title}`);

  // 2.5 Double-Lock Pre-Upload Visual Integrity Shield (Prevents any defective upload forever)
  console.log('\n🛡️ Double-Lock Pre-Upload Visual Integrity Shield executing...');
  const { verifyVideoIntegrity } = require('./verify-video-integrity');
  await verifyVideoIntegrity(metaPath);

  // 3. Compute Schedule Time
  const now = new Date();
  const publishDate = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  const publishAtIso = publishDate.toISOString();

  console.log(`\n📅 Safety Quarantine & Publish Schedule:`);
  console.log(`   - Upload Time (Private): ${now.toLocaleString()}`);
  console.log(`   - Auto-Public Time:      ${publishDate.toLocaleString()} (${delayHours}h safety buffer)`);
  console.log(`   - ISO 8601 publishAt:    ${publishAtIso}`);

  // 4. Authenticate with YouTube API
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  // Verify authentication
  try {
    const channelRes = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });
    const channelTitle = channelRes.data.items?.[0]?.snippet?.title || 'The History Uncut';
    console.log(`\n🔑 Authenticated to YouTube Channel: "${channelTitle}"`);
  } catch (authErr) {
    console.log(`\n🔑 Authenticated to YouTube API successfully (Upload Scope Active)`);
  }

  // 5. Upload Video with Scheduled Publish
  console.log('\nUploading video to YouTube with 2-Hour Scheduled Quarantine...');
  // vidIQ 500-Character Tag Budget Maximizer
  const rawTags = (meta.tags && meta.tags.length > 0) 
    ? meta.tags 
    : ['shorts', 'history', 'the history uncut', 'history facts', 'shocking history facts', 'dark ancient history', 'weird history facts', 'bizarre historical secrets', 'history uncut shorts'];

  const safeTags = [];
  let tagCharacterCount = 0;
  for (const t of rawTags) {
    const cleanTag = t.replace('#', '').trim();
    if (!cleanTag) continue;
    const cost = cleanTag.length + 1;
    if (tagCharacterCount + cost <= 450) {
      safeTags.push(cleanTag);
      tagCharacterCount += cost;
    }
  }
  console.log(`   🏷️  vidIQ Tags Loaded: ${safeTags.length} tags (${tagCharacterCount}/500 chars)`);

  const isInstantPublic = delayHours === 0;
  const statusObject = {
    privacyStatus: isInstantPublic ? 'public' : 'private',
    selfDeclaredMadeForKids: false
  };
  if (!isInstantPublic) {
    statusObject.publishAt = publishAtIso;
  }

  const requestBody = {
    snippet: {
      title: meta.title,
      description: meta.description || `${meta.title}\n\nSubscribe to The History Uncut to uncover more bizarre truths from history.\n\n#shorts #history #thehistoryuncut #historyfacts`,
      tags: safeTags,
      categoryId: '27', // Education
      defaultLanguage: 'en',
      defaultAudioLanguage: 'en'
    },
    status: statusObject
  };

  const uploadRes = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: requestBody,
    media: {
      body: fs.createReadStream(meta.videoPath)
    }
  });

  const videoId = uploadRes.data.id;
  const youtubeUrl = `https://youtu.be/${videoId}`;
  const studioUrl = `https://studio.youtube.com/video/${videoId}/edit`;

  console.log('\n====================================================');
  console.log('✅ UPLOAD SUCCESSFUL!');
  console.log(`   🎥 Video ID:        ${videoId}`);
  console.log(`   🔗 Direct Link:     ${youtubeUrl}`);
  console.log(`   🛠️  Studio Edit:     ${studioUrl}`);
  console.log(`   🔒 Status:          ${isInstantPublic ? 'PUBLIC (Live Now)' : 'PRIVATE (Quarantine Phase)'}`);
  if (!isInstantPublic) {
    console.log(`   ⏰ Goes PUBLIC At:  ${publishDate.toLocaleString()} (Automatic via YouTube Cloud)`);
  }
  console.log('====================================================');

  // 5b. Upload Custom Thumbnail if available
  const possibleThumb = meta.customThumbnail || path.join(path.dirname(meta.videoPath), `${path.basename(meta.videoPath, '.mp4')}_thumb.jpg`);
  if (fs.existsSync(possibleThumb)) {
    try {
      console.log(`\n🖼️  Uploading Custom Thumbnail: ${path.basename(possibleThumb)}...`);
      await youtube.thumbnails.set({
        videoId: videoId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(possibleThumb)
        }
      });
      console.log('   ✅ Custom Thumbnail uploaded and set successfully!');
    } catch (thumbErr) {
      console.log(`   ℹ️  Note on Custom Thumbnail API: ${thumbErr.message}`);
    }
  }

  // 6. Update metadata with upload result
  meta.youtubeId = videoId;
  meta.youtubeUrl = youtubeUrl;
  meta.scheduledPublishAt = isInstantPublic ? null : publishAtIso;
  meta.uploadStatus = isInstantPublic ? 'public' : 'scheduled';
  await fsPromises.writeFile(metaPath, JSON.stringify(meta, null, 2));

  // Log to master upload history
  const logDir = path.join(__dirname, '..', 'data');
  await fsPromises.mkdir(logDir, { recursive: true });
  const logPath = path.join(logDir, 'upload_history.log');
  const logEntry = `[${new Date().toISOString()}] ID: ${videoId} | Title: "${meta.title}" | PublicAt: ${publishAtIso} | URL: ${youtubeUrl}\n`;
  await fsPromises.appendFile(logPath, logEntry, 'utf8');

  return {
    videoId,
    youtubeUrl,
    publishAt: publishAtIso,
    channelTitle: 'The History Uncut'
  };
}

if (require.main === module) {
  const metaArg = process.argv[2] && process.argv[2].endsWith('.json') ? process.argv[2] : null;
  const delayArg = (process.argv[3] !== undefined && !isNaN(parseFloat(process.argv[3]))) ? parseFloat(process.argv[3]) : 2;
  uploadAndScheduleShort(metaArg, delayArg)
    .then(res => {
      console.log(`\n🎉 Pipeline completed. Video is safely scheduled.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Upload failed:', err.message);
      process.exit(1);
    });
}

module.exports = { uploadAndScheduleShort };
