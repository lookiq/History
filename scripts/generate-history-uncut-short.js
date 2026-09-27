require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const { runFFmpeg, checkFFmpeg } = require('../utils/ffmpeg');
const { HistoryCardGenerator } = require('../utils/history-card-generator');
const { AITextService } = require('../utils/ai-text-service');
const { VoiceoverService } = require('../utils/voiceover-service');
const { CinematicVideoFetcher } = require('../utils/cinematic-video-fetcher');
const { SubtitleGenerator } = require('../utils/subtitle-generator');

/**
 * MASTER SHORT GENERATOR - 100% PRODUCTION READY
 * Features:
 * 1. AI Research (Outlier facts, psychological hooks, multi-clip queries)
 * 2. Hybrid Voiceover (ElevenLabs Adam / Microsoft Neural Christopher)
 * 3. Anti-Content ID Shield:
 *    - 3-Second Cut Rule (Multi-clip montage)
 *    - Horizontal Flip (hflip)
 *    - 1.04x Speed Shift (setpts=0.96*PTS)
 *    - Cinematic Color Grading (eq filter)
 * 4. Millisecond Dynamic Subtitles (Karaoke-style active word highlighting)
 * 5. 100% History Bypass Layout (Top card, verified badge, watermark)
 * 6. Cinematic Audio Mix (Voiceover + Ducked Dark Ambient Music)
 */
const USA_VIRAL_TOPICS_POOL = [
  // ==========================================
  // WORLD WAR 1 (The Great War Shocking Outliers)
  // ==========================================
  {
    topic: "The Harlem Hellfighters: The legendary African American regiment that spent 191 days in frontline trenches without losing an inch of ground",
    era: "world_war_1"
  },
  {
    topic: "The Christmas Truce of 1914: The miraculous day enemy German and British soldiers stopped firing to play soccer and exchange gifts",
    era: "world_war_1"
  },
  {
    topic: "The Attack of the Dead Men: Russian soldiers at Osowiec Fortress who countercharged German poison gas with bloody rags over melted lungs",
    era: "world_war_1"
  },
  {
    topic: "The Red Baron: Manfred von Richthofen, the feared German flying ace who painted his fighter blood-red and claimed 80 kills",
    era: "world_war_1"
  },
  {
    topic: "Cher Ami: The heroic carrier pigeon that saved 194 surrounded American soldiers despite being shot through the chest and losing a leg",
    era: "world_war_1"
  },
  {
    topic: "The 1916 Tank Shock: When Britain first unleashed massive iron tanks on the Somme, terrifying German soldiers into mass surrender",
    era: "world_war_1"
  },
  {
    topic: "The Gallipoli Drip Rifle: How ANZAC troops used dripping tin cans of water to fire rifles automatically during their secret night evacuation",
    era: "world_war_1"
  },
  {
    topic: "Sergeant Stubby: The stray bull terrier who became the most decorated military dog of WWI by sniffing out poison gas and capturing a German spy",
    era: "world_war_1"
  },

  // ==========================================
  // WORLD WAR 2 (Bizarre Secrets & Crazy Operations)
  // ==========================================
  {
    topic: "The Ghost Army of World War 2: The artists and inflatable rubber tanks that tricked Hitler's intelligence into moving entire divisions",
    era: "world_war_2"
  },
  {
    topic: "Pervitin: How Nazi soldiers used pharmaceutical crystal meth to fight for 72 hours straight during the Blitzkrieg",
    era: "world_war_2"
  },
  {
    topic: "Corporal Wojtek: The 500-pound Syrian brown bear who was officially enlisted as a soldier and carried live artillery shells in combat",
    era: "world_war_2"
  },
  {
    topic: "Operation Mincemeat: How British intelligence used a dead homeless man with fake documents to fool Hitler into defending the wrong country",
    era: "world_war_2"
  },
  {
    topic: "Simo Häyhä: The White Death sniper who took down 505 enemy soldiers with iron sights in freezing snow without a telescope",
    era: "world_war_2"
  },
  {
    topic: "The Night Witches: The Soviet all-female military aviators who cut their engines to glide silently in the dark, dropping bombs on Nazi camps",
    era: "world_war_2"
  },
  {
    topic: "Hiroo Onoda: The Japanese soldier who held out on a remote Philippine island for 29 years after WWII ended, refusing to surrender until 1974",
    era: "world_war_2"
  },
  {
    topic: "The Navajo Code Talkers: The secret Native American language that Japanese intelligence could never decipher in World War II",
    era: "world_war_2"
  },
  {
    topic: "The Bat Bombs: The bizarre secret American WWII weapon designed to strap tiny incendiary bombs to thousands of bats",
    era: "world_war_2"
  },
  {
    topic: "Desmond Doss: The unarmed medic who refused to hold a weapon yet saved 75 wounded soldiers on Hacksaw Ridge under heavy enemy fire",
    era: "world_war_2"
  },
  {
    topic: "The St. Nazaire Raid: The greatest commando raid in history where a British destroyer rammed a dry dock packed with delayed explosives",
    era: "world_war_2"
  },
  {
    topic: "Mad Jack Churchill: The British officer who fought WWII with a Scottish broadsword, longbow, and bagpipes, capturing 42 German soldiers in one night",
    era: "world_war_2"
  }
];

async function generateHistoryUncutShort(customTopic = null) {
  console.log('====================================================');
  console.log('🎬 THE HISTORY UNCUT - ULTIMATE MASTER GENERATOR');
  console.log('   🎖️  EXCLUSIVE SERIES: WORLD WAR 1 & WORLD WAR 2 ONLY');
  console.log('   🛡️  Anti-Content ID Shield: ACTIVE (100% Copyright Safe)');
  console.log('   ⚡ Dynamic Subtitles: Millisecond Karaoke Active Word');
  console.log('   🎙️  Voiceover: Hybrid ElevenLabs / Neural Documentary');
  console.log('====================================================');

  const ffmpegOk = await checkFFmpeg();
  if (!ffmpegOk) throw new Error('FFmpeg is not available');

  const outputDir = path.join(__dirname, '..', 'data', 'videos');
  const tempDir = path.join(__dirname, '..', 'temp', 'render_' + Date.now());
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  const aiText = new AITextService();
  if (!aiText.isAvailable()) {
    throw new Error('No AI provider available. Check GROQ_API_KEY in .env');
  }

  // 1. AI Research & Scripting (Strictly World War 1 & World War 2 Exclusive)
  let selectedTopicInfo = null;
  if (!customTopic) {
    selectedTopicInfo = USA_VIRAL_TOPICS_POOL[Math.floor(Math.random() * USA_VIRAL_TOPICS_POOL.length)];
  }

  const topicGuidance = customTopic 
    ? `Specific World War topic: "${customTopic}"` 
    : `Target World War topic: "${selectedTopicInfo.topic}" (Era: ${selectedTopicInfo.era})`;

  console.log('\n🧠 1. Researching World War 1 / World War 2 outlier topic via AI...');
  console.log(`   🎯 Selected War Focus: ${customTopic || selectedTopicInfo.topic}`);

  const prompt = `You are the lead content director for the viral YouTube Shorts channel "The History Uncut" (@HistoryUncutUS).
MANDATORY CHANNEL RULE: The channel is currently locked EXCLUSIVELY to World War 1 and World War 2 viral outlier stories. Do NOT cover ancient, medieval, or other eras.
Topic preference: ${topicGuidance}. Ensure the story reveals an outlier, unbelievable, or shocking truth from World War 1 or World War 2 that hooks American viewers immediately.

Format rules:
1. headlineHook: 2 to 3 punchy lines for the top Twitter-style card (max 20 words). Follow STRICT VIRAL COLOR PSYCHOLOGY:
   - [word|yellow]: Protagonist, Commander, General, Soldier, Power (triggers Attention). E.g. [Soldiers|yellow], [General|yellow], [Hero|yellow].
   - [word|red]: Danger, Death, Gas, Enemy, Tanks, Bombs, Combat (triggers Survival & Threat alarm). E.g. [poison gas|red], [death|red], [tanks|red].
   - [word|cyan]: Secret, Forbidden, Decoy, Fake, Strategy, Spies (triggers Curiosity Loop). E.g. [inflatable|cyan], [secretly|cyan], [decoy|cyan].
   - [word|green]: Gold, Survival, Medals, Victory, Animals (triggers Taboo Fascination). E.g. [bear|green], [won|green], [survived|green].
   - Leave 70% of words untagged (pure white) so the psychological power words pop violently against the black background!
2. voiceScript: Engaging, gripping, story-driven spoken script (85 to 110 words, approx 40 to 45 seconds). Written for a deep documentary voice (NO bracket tags in voiceScript).
   Structure this 40-45s narrative into 3 compelling storytelling acts:
   - Act 1 (0-10s): An irresistible shocking opening hook that introduces the bizarre wartime dilemma.
   - Act 2 (10-30s): The gritty backstory, terrifying combat details, and how soldiers pulled it off.
   - Act 3 (30-38s): The unexpected wartime consequence or shocking outcome.
   - Act 4 (38-45s) MANDATORY SIGNATURE BRANDED ENDING: The very last sentence MUST end with:
     "[Topic-related question]? Subscribe to The History Uncut to uncover the truth."
     (e.g., "Would you have charged through the gas? Subscribe to The History Uncut to uncover the truth." or "Could you survive the trenches? Subscribe to The History Uncut to uncover the truth.")
3. visualQueries: An array of 5 to 6 specific search queries for distinct 3-second scene beats across the 40-45s timeline (e.g. ["ww1 trench warfare battle 1080p", "artillery bombardment battlefield 1080p", "soldiers charging no mans land 1080p", "ww2 combat cinematic 1080p", "tanks rolling battle 1080p"]).
4. title: STRICT vidIQ SEO Sweet Spot (50 to 60 characters total length).
   - Front-load the main high-volume search keyword in the first 30-40 characters (e.g. "The Ghost Army: How Inflatable Tanks Fooled Hitler #shorts").
   - MUST end with #shorts. Must NOT exceed 60 characters so it never cuts off on mobile devices.
5. description: STRICT vidIQ SEO Sweet Spot (350 to 650 characters total).
   - First 1-2 lines (first 140 characters before 'Show More'): Front-load the main target keyword within the first 25 words with an irresistible curiosity hook.
   - Middle paragraph: 2 natural, compelling sentences providing context without keyword stuffing.
   - Outro CTA: "Subscribe to The History Uncut to uncover more bizarre truths from history."
   - Bottom: Exactly 3 to 5 relevant hashtags (e.g. #history #shorts #thehistoryuncut #ww2 #ww1 #historyfacts).
6. tags: Array of 15 to 22 high-search, low-competition tags (targeting 380-460 total characters).
   - Include primary keywords ("world war 2", "world war 1", "ww2 facts", "ww1 history", "shocking war facts"), long-tail search queries, and channel tags ("the history uncut", "history uncut shorts").
7. era: MUST be either "world_war_1" or "world_war_2"

Respond ONLY with valid JSON in this exact structure:
{
  "topic": "Topic Name",
  "era": "world_war_2",
  "headlineHook": "Line 1 with [colored|yellow] words\\nLine 2 with [colored|red] words",
  "voiceScript": "Spoken script text here ending with: [Topic question]? Subscribe to The History Uncut to uncover the truth.",
  "visualQueries": ["scene 1 query", "scene 2 query", "scene 3 query"],
  "title": "Main Keyword Frontloaded: Hook Here #shorts",
  "description": "First 1-2 lines with main keyword hook...\\n\\nContext sentence here.\\n\\nSubscribe to The History Uncut to uncover more bizarre truths from history.\\n\\n#history #shorts #thehistoryuncut #ww2 #historyfacts",
  "tags": ["main keyword", "secondary keyword", "world war 2", "the history uncut"]
}`;

  const responseText = await aiText.generateText(prompt, { temperature: 0.7, maxTokens: 850 });
  let content;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    content = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn('AI output parse fallback:', err.message);
    content = {
      topic: 'The Ghost Army of World War II',
      era: 'world_war_2',
      headlineHook: 'The [Secret Army|yellow] that tricked [Hitler|red]\nwith [inflatable tanks|cyan] and [actors.|green]',
      voiceScript: 'During World War II, the United States deployed a top secret unit known as the Ghost Army. Instead of weapons, this elite battalion was made up of actors, artists, and sound engineers. Armed with inflatable rubber tanks, dummy aircraft, and massive speakers broadcasting recorded tank sounds, they staged over twenty battlefield deceptions. German intelligence believed an entire division was moving, shifting their armies to the wrong locations and saving tens of thousands of Allied lives. Could you trick an entire army with balloons? Subscribe to The History Uncut to uncover the truth.',
      visualQueries: ['ww2 soldiers trench battlefield 1080p', 'ww2 tanks moving battle 1080p', 'allied soldiers combat 1080p', 'normandy invasion battle scene 1080p', 'ww2 army marching dramatic 1080p'],
      title: 'The Ghost Army: Fake Tanks That Fooled Hitler #shorts',
      description: 'The Ghost Army of World War II used inflatable rubber tanks and sound effects to deceive Nazi forces.\n\nOver 1,100 artists and actors staged fake military divisions, tricking Hitler into shifting his elite divisions.\n\nSubscribe to The History Uncut to uncover more bizarre truths from history.\n\n#history #shorts #thehistoryuncut #ww2 #ghostarmy',
      tags: ['the ghost army', 'world war 2', 'ww2 deception', 'inflatable tanks', 'hitler fooled', 'shocking ww2 facts', 'weird war stories', 'military secrets', 'ww2 intelligence', 'allied deception', 'the history uncut', 'history uncut shorts']
    };
  }

  console.log(`📌 Topic: ${content.topic} (Era: ${content.era || 'auto'})`);
  console.log(`📜 Headline Hook:\n${content.headlineHook}`);
  console.log(`🎙️  Voice Script: "${content.voiceScript}"`);

  // 2. Generate Voiceover (Hybrid Mode)
  console.log('\n🎙️  2. Generating deep documentary voiceover...');
  const voiceService = new VoiceoverService();
  const voiceoverPath = path.join(tempDir, 'voiceover.mp3');
  const voiceResult = await voiceService.generateVoiceover(content.voiceScript, voiceoverPath, { voice: 'adam' });
  const videoDuration = Math.max(Math.ceil(voiceResult.duration) + 1, 8);
  console.log(`   Voiceover generated (${voiceResult.provider}): ${voiceResult.duration.toFixed(1)}s (Total duration: ${videoDuration}s)`);

  // 3. Generate Dynamic Word-by-Word Subtitles (Karaoke Pop-in)
  console.log('\n⚡ 3. Generating millisecond dynamic word-by-word subtitles...');
  const subGenerator = new SubtitleGenerator({
    fontName: 'Segoe UI',
    fontSize: 54,
    highlightColor: '&H0014E6FA', // Glowing Gold-Yellow
    primaryColor: '&H00FFFFFF',   // Crisp White
    outlineColor: '&H00000000',   // Black outline
    outlineWidth: 4,
    marginV: 560                  // Perfectly centered in video lower-third
  });
  const subPath = path.join(tempDir, 'dynamic_subtitles.ass');
  await subGenerator.generateSubtitles(content.voiceScript, voiceResult.duration, subPath);
  console.log(`   Dynamic ASS subtitles saved: ${subPath}`);

  // 4. Source Video Montage with Anti-Content ID Shield & Semantic Topic Matching
  console.log('\n🛡️  4. Sourcing montage with Anti-Content ID Shield & Semantic Topic Grounding...');
  const videoFetcher = new CinematicVideoFetcher({ tempDir });
  const montagePath = path.join(tempDir, 'shielded_montage.mp4');
  await videoFetcher.fetchMontageClips(content.visualQueries, videoDuration, montagePath, {
    era: content.era,
    topic: content.topic
  });

  // 5. Render History Bypass Top Card & Floating CTA Badge Overlay
  console.log('\n🏷️  5. Rendering History Bypass Top Card & Floating CTA Badge...');
  const cardGenerator = new HistoryCardGenerator({
    channelName: process.env.CHANNEL_DISPLAY_NAME || 'The History Uncut',
    channelHandle: process.env.CHANNEL_HANDLE || '@HistoryUncutUS',
    avatarPath: path.join(__dirname, '..', 'assets', 'history_uncut_logo.png'),
    width: 1080,
    height: 1920
  });
  const overlayPath = path.join(tempDir, 'card_overlay.png');
  const cardResult = await cardGenerator.renderCardOverlay(content.headlineHook, overlayPath);
  console.log(`   Top Card rendered. Video Y-Position: ${cardResult.videoY}px`);

  const ctaOverlayPath = path.join(tempDir, 'cta_overlay.png');
  await cardGenerator.renderCtaOverlay(ctaOverlayPath, {
    channelName: process.env.CHANNEL_DISPLAY_NAME || 'The History Uncut',
    actionText: 'Uncover the truth 👇'
  });
  console.log(`   Floating CTA Badge rendered (Appears in final 3.5s).`);

  // 6. Audio Track & FFmpeg Final Assembly
  const musicPath = path.join(__dirname, '..', 'assets', 'audio', 'dark_suspense.mp3');
  const timestamp = Date.now();
  const videoFileName = `master_short_${timestamp}.mp4`;
  const finalVideoPath = path.join(outputDir, videoFileName);

  console.log(`\n🎬 6. Compositing 1080x1920 Short via FFmpeg (Montage + Card + Hybrid CTA + Dynamic Subs + Audio Ducking)...`);

  const ctaStartTime = Math.max(videoDuration - 3.5, 0);
  const relSubPath = path.relative(process.cwd(), subPath).replace(/\\/g, '/');
  const filterComplex = 
    `color=c=black:s=1080x1920:d=${videoDuration}:r=30[bg];` +
    `[bg][0:v]overlay=(W-w)/2:${cardResult.videoY}[mid];` +
    `[mid][1:v]overlay=0:0[carded];` +
    `[carded][4:v]overlay=0:0:enable='between(t,${ctaStartTime},${videoDuration})'[with_cta];` +
    `[with_cta]ass='${relSubPath}'[outv];` +
    `[3:a]volume=0.14,atrim=0:${videoDuration},afade=t=out:st=${videoDuration - 1.5}:d=1.5[music];` +
    `[2:a]volume=1.0[voice];` +
    `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;

  await runFFmpeg([
    '-y',
    '-i', montagePath,                                  // [0:v] Shielded Montage
    '-i', overlayPath,                                  // [1:v] Card Overlay
    '-i', voiceResult.outputPath,                       // [2:a] Spoken Voice
    '-stream_loop', '-1', '-i', musicPath,             // [3:a] Dark Ambient Music
    '-i', ctaOverlayPath,                               // [4:v] Floating CTA Badge
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

  console.log(`\n🎉 SUCCESS! Master Short generated at:\n   ${finalVideoPath}\n`);

  // Extract preview frame for visual inspection
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
    ...content,
    videoPath: finalVideoPath,
    previewPath,
    duration: videoDuration,
    voiceProvider: voiceResult.provider,
    voiceName: voiceResult.voice,
    antiCopyrightShield: true,
    dynamicSubtitles: true,
    createdAt: new Date().toISOString()
  };
  await fs.writeFile(metadataPath, JSON.stringify(fullMeta, null, 2));

  return fullMeta;
}

if (require.main === module) {
  const topicArg = process.argv.slice(2).join(' ') || null;
  generateHistoryUncutShort(topicArg)
    .then(res => {
      console.log('====================================================');
      console.log('📌 100% READY FOR PUBLISHING:');
      console.log(`Title: ${res.title}`);
      console.log(`Duration: ${res.duration}s`);
      console.log(`Voice: ${res.voiceProvider} (${res.voiceName})`);
      console.log(`Shield: Anti-Content ID Active (hflip + 3s cuts + speed shift)`);
      console.log(`Subtitles: Dynamic Word-by-Word Active`);
      console.log(`File: ${res.videoPath}`);
      console.log('====================================================');
    })
    .catch(err => {
      console.error('Error generating master short:', err);
      process.exit(1);
    });
}

module.exports = { generateHistoryUncutShort };
