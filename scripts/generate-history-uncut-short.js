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
  // 1. World War II & Military Outliers
  {
    topic: "The Ghost Army of World War 2: The actors and inflatable rubber tanks that tricked Hitler's intelligence",
    era: "world_war_2"
  },
  {
    topic: "Pervitin: How Nazi soldiers used pharmaceutical crystal meth to power the 72-hour Blitzkrieg",
    era: "world_war_2"
  },
  {
    topic: "Corporal Wojtek: The 500-pound Syrian brown bear who carried live artillery shells in WWII combat",
    era: "world_war_2"
  },
  {
    topic: "Operation Mincemeat: How British spies used a dead homeless man with fake documents to fool Hitler",
    era: "world_war_2"
  },
  {
    topic: "Simo Häyhä: The White Death sniper who took down 505 enemy soldiers with iron sights in freezing snow",
    era: "world_war_2"
  },

  // 2. Ancient Rome & Gladiator Shocking Secrets
  {
    topic: "Gladiator Sweat: Why Roman noblewomen paid fortunes to use gladiators' sweat as anti-aging facial cream",
    era: "ancient_rome"
  },
  {
    topic: "Emperor Caligula: The mad Roman ruler who declared war on Neptune's ocean and made his horse a senator",
    era: "ancient_rome"
  },
  {
    topic: "The Roman Xylospongium: The horrifying reality of ancient Roman public toilets and shared sea sponges",
    era: "ancient_rome"
  },
  {
    topic: "The Vestal Virgins: The terrifying Roman punishment where priestesses were buried alive in underground chambers",
    era: "ancient_rome"
  },

  // 3. Brutal Ancient Tortures & Shocking Laws
  {
    topic: "The Brazen Bull: The ancient bronze execution chamber designed to turn human screams into bull sounds",
    era: "medieval"
  },
  {
    topic: "The Viking Blood Eagle: The terrifying execution where ribs were carved open to resemble bloody eagle wings",
    era: "medieval"
  },
  {
    topic: "Hammurabi's Code: The brutal ancient Babylonian laws that amputated surgeons' hands if an operation failed",
    era: "ancient_egypt"
  },

  // 4. Forbidden / Untaught American History
  {
    topic: "Abraham Lincoln's Wrestling Legacy: The US President who won 299 out of 300 brutal wrestling matches and entered the Hall of Fame",
    era: "world_war_2"
  },
  {
    topic: "George Washington's Teeth: The dark truth about how America's first president wore dentures pulled from enslaved men",
    era: "world_war_2"
  },
  {
    topic: "Prohibition Poison: When the US government poisoned industrial alcohol in the 1920s, killing 10,000 citizens",
    era: "world_war_2"
  },

  // 5. Spartan Alpha Warrior Brutality
  {
    topic: "The Spartan Baby Cliff: How Spartan elders inspected newborns and threw weak infants off Mount Taygetos",
    era: "ancient_greece"
  },
  {
    topic: "The Spartan Wedding Ritual: Why Spartan brides were forced to shave their heads and dress as boys on wedding nights",
    era: "ancient_greece"
  },
  {
    topic: "The Crypteia: Spartan teenagers sent into the night with daggers to terrorize and assassinate slave leaders",
    era: "ancient_greece"
  },

  // 6. Ottoman Empire Shocking Outliers (Channel Proven High-Performer)
  {
    topic: "The Ottoman Kafes: Why Ottoman princes were locked in the Golden Cage for 40 years until going completely insane",
    era: "ottoman_empire"
  },
  {
    topic: "The Janissaries: Christian boys taken from families who became the Ottoman Empire's deadliest shock troops",
    era: "ottoman_empire"
  }
];

async function generateHistoryUncutShort(customTopic = null) {
  console.log('====================================================');
  console.log('🎬 THE HISTORY UNCUT - ULTIMATE MASTER GENERATOR');
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

  // 1. AI Research & Scripting (Curated USA High-Conversion Pool)
  let selectedTopicInfo = null;
  if (!customTopic) {
    selectedTopicInfo = USA_VIRAL_TOPICS_POOL[Math.floor(Math.random() * USA_VIRAL_TOPICS_POOL.length)];
  }

  const topicGuidance = customTopic 
    ? `Specific topic: "${customTopic}"` 
    : `Target topic: "${selectedTopicInfo.topic}" (Era: ${selectedTopicInfo.era})`;

  console.log('\n🧠 1. Researching viral outlier history topic via AI...');
  console.log(`   🎯 Selected Strategic Focus: ${customTopic || selectedTopicInfo.topic}`);

  const prompt = `You are the lead content director for the viral YouTube Shorts channel "The History Uncut" (@HistoryUncutUS).
Topic preference: ${topicGuidance}. Ensure the story reveals an outlier, unbelievable, or shocking truth that hooks American viewers immediately.

Format rules:
1. headlineHook: 2 to 3 punchy lines for the top Twitter-style card (max 20 words). Follow STRICT VIRAL COLOR PSYCHOLOGY:
   - [word|yellow]: Protagonist, Emperor, King, Power, Status (triggers Attention). E.g. [Nero|yellow], [Gladiators|yellow], [Bruce Lee|yellow].
   - [word|red]: Danger, Death, Poison, Murder, Fatal, Blood, Execution (triggers Survival & Threat alarm). E.g. [poison|red], [death|red], [executed|red].
   - [word|cyan]: Secret, Forbidden, Hidden truth, Mystery, Doctors, Conspiracy (triggers Curiosity Loop). E.g. [secretly|cyan], [hidden|cyan], [banned|cyan].
   - [word|green]: Taboo substances, Drugs, Venom, Gold, Riches (triggers Taboo Fascination). E.g. [cannabis|green], [gold|green].
   - Leave 70% of words untagged (pure white) so the psychological power words pop violently against the black background!
2. voiceScript: Engaging, gripping, story-driven spoken script (85 to 110 words, approx 40 to 45 seconds). Written for a deep documentary voice (NO bracket tags in voiceScript).
   Structure this 40-45s narrative into 3 compelling storytelling acts:
   - Act 1 (0-10s): An irresistible shocking opening hook that introduces the bizarre historical dilemma.
   - Act 2 (10-30s): The gritty backstory, terrifying details, and how historical figures carried it out.
   - Act 3 (30-38s): The unexpected historical consequence, taboo irony, or brutal outcome.
   - Act 4 (38-45s) MANDATORY SIGNATURE BRANDED ENDING: The very last sentence MUST end with:
     "[Topic-related question]? Subscribe to The History Uncut to uncover the truth."
     (e.g., "Would you have survived Nero's banquet? Subscribe to The History Uncut to uncover the truth." or "Could you endure Ancient Rome? Subscribe to The History Uncut to uncover the truth.")
3. visualQueries: An array of 5 to 6 specific search queries for distinct 3-second scene beats across the 40-45s timeline (e.g. ["roman palace banquet 1080p", "ancient chalice wine poison 1080p", "emperor guards combat 1080p", "colosseum gladiator fight 1080p", "ancient senate betrayal 1080p"]).
4. title: STRICT vidIQ SEO Sweet Spot (50 to 60 characters total length).
   - Front-load the main high-volume search keyword in the first 30-40 characters (e.g. "Ottoman Law of Fratricide: Why Sultans Killed #shorts").
   - MUST end with #shorts. Must NOT exceed 60 characters so it never cuts off on mobile devices.
5. description: STRICT vidIQ SEO Sweet Spot (350 to 650 characters total).
   - First 1-2 lines (first 140 characters before 'Show More'): Front-load the main target keyword within the first 25 words with an irresistible curiosity hook.
   - Middle paragraph: 2 natural, compelling sentences providing context without keyword stuffing.
   - Outro CTA: "Subscribe to The History Uncut to uncover more bizarre truths from history."
   - Bottom: Exactly 3 to 5 relevant hashtags (e.g. #history #shorts #thehistoryuncut #historyfacts #ancienthistory).
6. tags: Array of 15 to 22 high-search, low-competition tags (targeting 380-460 total characters).
   - Include primary keywords, long-tail search queries ("shocking history facts", "dark ancient history", "weird history facts", "brutal ancient laws", "bizarre historical secrets"), and channel tags ("the history uncut", "history uncut shorts").
7. era: One of "ottoman_empire", "ancient_rome", "bruce_lee", "ancient_egypt", "medieval", "ancient_greece", "world_war_2"

Respond ONLY with valid JSON in this exact structure:
{
  "topic": "Topic Name",
  "era": "ottoman_empire",
  "headlineHook": "Line 1 with [colored|yellow] words\\nLine 2 with [colored|red] words",
  "voiceScript": "Spoken script text here ending with: [Topic question]? Subscribe to The History Uncut to uncover the truth.",
  "visualQueries": ["scene 1 query", "scene 2 query", "scene 3 query"],
  "title": "Main Keyword Frontloaded: Hook Here #shorts",
  "description": "First 1-2 lines with main keyword hook...\\n\\nContext sentence here.\\n\\nSubscribe to The History Uncut to uncover more bizarre truths from history.\\n\\n#history #shorts #thehistoryuncut #historyfacts #targettopic",
  "tags": ["main keyword", "secondary keyword", "long tail query", "the history uncut"]
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
      topic: 'Roman Gladiator Superstars',
      era: 'ancient_rome',
      headlineHook: '[Roman gladiators|yellow] rarely fought to the [death.|red]\nThey were expensive [superstars|cyan]\nowned by wealthy [trainers.|green]',
      voiceScript: 'Roman gladiators rarely fought to the death in the blood-soaked Colosseum. In reality, they were idolized superstars, meticulously trained and owned by wealthy promoters. Because training a gladiator cost a small fortune, killing one required the event sponsor to pay massive compensation. Most fights ended in submission, and wounded fighters received the best medical care in the ancient world. They even endorsed Roman cosmetics and olive oil. Would you fight for glory in the Colosseum? Subscribe to The History Uncut to uncover the truth.',
      visualQueries: ['gladiator colosseum combat scene 1080p', 'roman emperor gladiator arena 1080p', 'ancient rome battle cinematic 1080p', 'gladiator training ludus arena 1080p', 'roman crowd cheering colosseum 1080p'],
      title: 'Roman Gladiators: The Superstar Secret #shorts',
      description: 'Roman gladiators rarely fought to the death in the Colosseum. In reality, they were idolized superstars owned by elite trainers who insured their lives.\n\nLearn the shocking truth about how ancient Rome really treated its arena legends.\n\nSubscribe to The History Uncut to uncover more bizarre truths from history.\n\n#history #shorts #thehistoryuncut #historyfacts #ancientrome',
      tags: ['roman gladiators', 'gladiators ancient rome', 'colosseum facts', 'shocking history facts', 'dark ancient history', 'weird history facts', 'gladiator fight to the death', 'roman empire secrets', 'ancient rome documentary', 'bizarre historical facts', 'the history uncut', 'history uncut shorts']
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
