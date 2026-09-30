require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const { DeepResearchEngine } = require('../utils/deep-research-engine');
const { VoiceoverService } = require('../utils/voiceover-service');
const { SubtitleGenerator } = require('../utils/subtitle-generator');
const { CinematicVideoFetcher } = require('../utils/cinematic-video-fetcher');
const { BrandingOverlayGenerator } = require('../utils/branding-overlay-generator');
const { runFFmpeg } = require('../utils/ffmpeg');

/**
 * 100% PROFESSIONAL FULL-BLEED CINEMATIC SHORT GENERATOR
 * Replicates the exact style of the viral benchmark "The Ghost Army" (aUh1Zaj-czA)
 * Features:
 *  1. Deep forensic historical research on WW1/WW2 outlier events.
 *  2. 60-second retention script with impossible hook & philosophical cliffhanger.
 *  3. Full-bleed 1080x1920 cinematic footage (zero cards, zero black bars).
 *  4. Lower-third bold subtitles with golden-orange active word highlight.
 *  5. Audio mastered with deep documentary voice + dark ambient war drone.
 */
async function generateFullBleedDocumentaryShort(customTopic = null, options = {}) {
  const enableBranding = options.branding !== false; // Default true

  console.log('====================================================');
  console.log('🎬 THE HISTORY UNCUT - FULL-BLEED MASTER GENERATOR');
  console.log('   🔥 Benchmark Style: Full-Screen Cinematic (aUh1Zaj-czA)');
  console.log('   🧠 Deep Research & Forensic Fact-Checking: ACTIVE');
  console.log(`   🏷️  Channel Branding & Subscribe CTA Pill: ${enableBranding ? 'ACTIVE' : 'OFF'}`);
  console.log('   🛡️  Anti-Content ID Shield: ACTIVE (100% Safe)');
  console.log('====================================================');

  const timestamp = Date.now();
  const tempDir = path.join(__dirname, '..', 'temp', `fullbleed_${timestamp}`);
  const outputDir = path.join(__dirname, '..', 'data', 'videos');
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Deep Research & Scriptwriting Engine
  const researchEngine = new DeepResearchEngine();
  const dossier = await researchEngine.researchAndScriptShort(customTopic);

  console.log('\n📜 [Deep Research Dossier]');
  console.log(`   📌 Topic: ${dossier.topic} (Era: ${dossier.era})`);
  console.log(`   🪝 Hook: "${dossier.hook}"`);
  console.log(`   🎬 Visual Scenes: ${dossier.visualQueries?.length || 8}`);

  // 2. Deep Documentary Voiceover Generation
  const voiceService = new VoiceoverService({
    fallbackVoice: options.voice || 'andrew'
  });
  const voicePath = path.join(tempDir, 'voiceover.mp3');
  const voiceResult = await voiceService.generateVoiceover(dossier.voiceScript, voicePath);
  const videoDuration = Math.ceil(voiceResult.duration) + 1;
  console.log(`   🔊 Voice Duration: ${voiceResult.duration.toFixed(1)}s (Total short duration: ${videoDuration}s)`);

  // 3. Channel Branding & Subtitle Generation
  let brandingOverlayPath = null;
  let subtitleGen;

  if (enableBranding) {
    const overlayGen = new BrandingOverlayGenerator({
      projectRoot: path.join(__dirname, '..'),
      channelName: 'The History Uncut',
      handle: '@HistoryUncutUS'
    });
    brandingOverlayPath = path.join(tempDir, 'branding_overlay.png');
    await overlayGen.generateOverlay(brandingOverlayPath);
    console.log(`   🏷️  Branding & Subscribe CTA overlay generated.`);

    // In-Pill Subtitles (Rendered cleanly inside the golden-bordered caption pill)
    subtitleGen = new SubtitleGenerator({
      fontName: 'Segoe UI',
      fontSize: 38,
      primaryColor: '&H001E232F',      // Charcoal / Dark Slate for high contrast on white
      highlightColor: '&H001A24D4',    // Vivid Red active word highlight (&HAABBGGRR)
      outlineColor: '&H00FFFFFF',      // Subtle white edge
      outlineWidth: 1.5,
      shadow: 0,
      marginL: 290,
      marginR: 150,
      marginV: 375,                    // In-pill vertical center (Y≈1525)
      maxWords: 3                      // 2-3 words per phrase to fit pill width perfectly
    });
  } else {
    // Classic Lower-Third Karaoke Subtitles
    subtitleGen = new SubtitleGenerator({
      fontName: 'Segoe UI',
      fontSize: 58,
      primaryColor: '&H00FFFFFF',      // Crisp White
      highlightColor: '&H0000A5FF',    // Golden Orange
      outlineColor: '&H00000000',      // Solid Black Stroke
      outlineWidth: 4.5,
      shadow: 2,
      marginV: 450                     // Lower-third positioning (Y≈1420)
    });
  }

  const subPath = path.join(tempDir, 'dynamic_subtitles.ass');
  await subtitleGen.generateSubtitles(dossier.voiceScript, voiceResult.duration, subPath);
  console.log(`   ⚡ Dynamic Subtitles saved (${enableBranding ? 'In-Pill' : 'Classic'}).`);

  // 4. Sourcing Scene-Specific Cinematic Footage
  const visualQueries = dossier.visualQueries || (dossier.scenes ? dossier.scenes.map(s => s.visualQuery) : [dossier.topic]);
  const fetcher = new CinematicVideoFetcher({
    tempDir
  });

  const montagePath = path.join(tempDir, 'fullbleed_montage.mp4');
  console.log('\n🛡️  Sourcing Scene-by-Scene Visuals for Full-Bleed 1080x1920 Canvas...');
  
  // Fetch clips matching the deep research queries
  await fetcher.fetchMontageClips(visualQueries, videoDuration, montagePath, {
    topic: dossier.topic,
    era: dossier.era
  });

  // Re-assemble into 1080x1920 full-bleed format if needed
  // fetchMontageClips outputs montagePath; let's ensure full 1080x1920 full bleed
  const fullBleedMontagePath = path.join(tempDir, 'montage_1080x1920.mp4');
  await runFFmpeg([
    '-y',
    '-i', montagePath,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(in_w-out_w)/2:(in_h-out_h)/2,setsar=1,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    fullBleedMontagePath
  ]);

  // 5. Audio Ducking & Final FFmpeg Compositing
  const musicPath = path.join(__dirname, '..', 'assets', 'audio', 'dark_suspense.mp3');
  const videoFileName = `master_short_${timestamp}.mp4`;
  const finalVideoPath = path.join(outputDir, videoFileName);

  console.log('\n🎬 Compositing Full-Bleed 1080x1920 Master Short via FFmpeg...');
  const relSubPath = path.relative(process.cwd(), subPath).replace(/\\/g, '/');

  let filterComplex;
  const ffmpegInputs = [
    '-y',
    '-i', fullBleedMontagePath,                         // [0:v] 1080x1920 Full Bleed Video
    '-i', voiceResult.outputPath,                       // [1:a] Voiceover
    '-stream_loop', '-1', '-i', musicPath              // [2:a] Dark Ambient War Drone
  ];

  if (enableBranding && brandingOverlayPath) {
    ffmpegInputs.push('-i', brandingOverlayPath);      // [3:v] Branding & CTA Overlay
    filterComplex =
      `[0:v][3:v]overlay=0:0[vbrand];` +
      `[vbrand]ass='${relSubPath}'[outv];` +
      `[2:a]volume=0.08,atrim=0:${videoDuration},afade=t=out:st=${videoDuration - 1.5}:d=1.5[music];` +
      `[1:a]volume=1.45,acompressor=threshold=-16dB:ratio=4:attack=5:release=50[voice];` +
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;
  } else {
    filterComplex =
      `[0:v]ass='${relSubPath}'[outv];` +
      `[2:a]volume=0.08,atrim=0:${videoDuration},afade=t=out:st=${videoDuration - 1.5}:d=1.5[music];` +
      `[1:a]volume=1.45,acompressor=threshold=-16dB:ratio=4:attack=5:release=50[voice];` +
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;
  }

  await runFFmpeg([
    ...ffmpegInputs,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '[outa]',
    '-t', String(videoDuration),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-pix_fmt', 'yuv420p',
    finalVideoPath
  ]);

  console.log(`\n🎉 SUCCESS! Full-Bleed Master Short generated at:\n   ${finalVideoPath}\n`);

  // Extract preview frame for inspection
  const previewPath = path.join(tempDir, 'frame_preview.png');
  try {
    await runFFmpeg([
      '-y',
      '-ss', String(Math.floor(videoDuration / 2)),
      '-i', finalVideoPath,
      '-vframes', '1',
      previewPath
    ]);
  } catch {}

  // Save metadata
  const metadataPath = path.join(outputDir, `master_short_${timestamp}_meta.json`);
  const fullMeta = {
    ...dossier,
    videoPath: finalVideoPath,
    previewPath,
    duration: videoDuration,
    voiceProvider: voiceResult.provider,
    voiceName: voiceResult.voice,
    style: enableBranding ? 'branded_cta_full_bleed' : 'full_bleed_cinematic',
    createdAt: new Date().toISOString()
  };
  await fs.writeFile(metadataPath, JSON.stringify(fullMeta, null, 2));

  return fullMeta;
}

if (require.main === module) {
  const topicArg = process.argv.slice(2).join(' ') || null;
  generateFullBleedDocumentaryShort(topicArg)
    .then(res => {
      console.log('====================================================');
      console.log('📌 FULL-BLEED SHORT READY FOR REVIEW:');
      console.log(`Title: ${res.title}`);
      console.log(`Duration: ${res.duration}s`);
      console.log(`File: ${res.videoPath}`);
      console.log('====================================================');
    })
    .catch(err => {
      console.error('Error generating short:', err);
      process.exit(1);
    });
}

module.exports = { generateFullBleedDocumentaryShort };
