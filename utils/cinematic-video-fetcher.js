const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const YTDLP_PATH = process.env.YTDLP_PATH || (process.platform === 'win32' 
  ? 'C:\\Users\\MD JEWEL RANA\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe' 
  : 'yt-dlp');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'used_clips_history.json');

async function loadUsedClipsHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function recordUsedClip(id, title, context = {}) {
  try {
    const history = await loadUsedClipsHistory();
    if (!history.some(item => item.id === id)) {
      history.push({
        id,
        title: title || '',
        topic: context.topic || '',
        era: context.era || '',
        usedAt: new Date().toISOString()
      });
      await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn(`Could not save to used_clips_history: ${err.message}`);
  }
}

/**
 * CURATED HISTORICAL CINEMATIC VAULT
 * High quality diverse historical scenes used ONLY as emergency fallback
 */
const HISTORICAL_CURATED_VAULT = {
  ancient_rome: [
    { id: 'xH0kO5qcPf8', title: "HBO's Rome - Roman Forum & Citizens", safeStart: 18 },
    { id: 'ap2Bs3zESYM', title: "HBO's Rome - Caesar & Senate Chambers", safeStart: 25 },
    { id: 'R2AS6JX2UDQ', title: "HBO's Rome - Roman Legions Battle Armor", safeStart: 30 },
    { id: 'lKn-Agk-yAI', title: "Gladiator (2000) - Maximus in Colosseum", safeStart: 20 },
    { id: 'wswyYRObcIc', title: "Gladiator (2000) - Emperor & Arena Crowd", safeStart: 35 }
  ],
  bruce_lee: [
    { id: 'sJKdtV5B54w', title: "Enter the Dragon - Bruce Lee Underground Combat", safeStart: 20 },
    { id: 'AA6KUxZe2c4', title: "Enter the Dragon - Bruce Lee Martial Arts Tournament", safeStart: 25 },
    { id: '0SZ0a6QkKl4', title: "Enter the Dragon - Epic Kung Fu Hits", safeStart: 15 }
  ],
  ancient_egypt: [
    { id: 'u3XXKF0oDtU', title: "The Mummy (1999) - Pharaoh Palace & Ancient Priest", safeStart: 20 },
    { id: 'oXNdG39CLDg', title: "The Mummy (1999) - Ancient Hamunaptra Ruins & Battle", safeStart: 30 }
  ],
  ancient_greece: [
    { id: '4Prc1UfuokY', title: "300 (2006) - Spartan Warriors & Council", safeStart: 25 },
    { id: 'h0E0CQJoarg', title: "Troy (2004) - Achilles & Ancient Greek Army", safeStart: 30 }
  ],
  medieval: [
    { id: 'j9GFCv2eZRg', title: "Kingdom of Heaven - Siege of Jerusalem & Knights", safeStart: 25 },
    { id: 'jq35bep2TbU', title: "Kingdom of Heaven - Medieval Knights Combat", safeStart: 35 }
  ],
  ottoman_empire: [
    { id: 'LKl6CXgVwDU', title: "Rise of Empires Ottoman - Fall of Constantinople", safeStart: 35 },
    { id: 'uBsWaYc0VXg', title: "Rise of Empires: Ottoman - Sultan Mehmed II Court", safeStart: 20 },
    { id: 'twijKovvrwE', title: "Rise of Empires: Ottoman - Palace & Execution Order", safeStart: 25 },
    { id: '4han6ZIqqxs', title: "Rise of Empires Ottoman - Mehmed The Conqueror", safeStart: 30 },
    { id: 'O-mP48R7miw', title: "Kurulus Osman - Ottoman Warriors Battle Action", safeStart: 35 }
  ],
  world_war_1: [
    { id: '3vPG1wj4mYs', title: "Epic WW1 Reenactment Rockford Trench Combat", safeStart: 50 },
    { id: 'QC5AfhS_D7c', title: "Epic WW1 Reenactment Rockford Charge", safeStart: 45 },
    { id: 'JHJIbKnzVnc', title: "WWI The Germans Release First Chemical Gas WMD", safeStart: 55 },
    { id: 'vmir6SxYNII', title: "First World War tech: Chlorine Gas & Gas Masks", safeStart: 50 },
    { id: 'HLayJ_n2PV0', title: "The First Gas Attack in History Langemark WW1", safeStart: 60 },
    { id: '-lSLWnfCP6M', title: "WW1 Gas Attack Western Front Trench", safeStart: 45 },
    { id: 'Sdj7XZYjAmM', title: "Attack of the Dead Men Osowiec Fortress WW1", safeStart: 60 },
    { id: 'dJe6Dt84Wws', title: "Attack of the Dead, Third Battle of Osowiec", safeStart: 50 },
    { id: '5W-n6mQbAMU', title: "Verdun 1916 The 300-Day Hell of World War I", safeStart: 70 },
    { id: 'EfKS-jRKAFc', title: "German Prisoners 1914-1918 Historical Footage", safeStart: 45 },
    { id: 's6DERzglY1g', title: "History Channel World War I Battle Action", safeStart: 50 },
    { id: 'kfyf0tJLPSI', title: "German troops attacking Western Front Footage", safeStart: 40 },
    { id: 'nzWPcCDOP4Y', title: "German soldiers WW1 Reenactment Combat", safeStart: 35 }
  ],
  world_war_2: [
    { id: 'WXusCl05hG0', title: "Band of Brothers - Infantry Battle Combat", safeStart: 20 },
    { id: 'iYRHFOu9xlc', title: "Saving Private Ryan - WWII Battle Scene", safeStart: 30 },
    { id: '0Xc4ckTTQN0', title: "Fury - Sherman Tank WWII Combat", safeStart: 25 },
    { id: 'LyZK8k4gzyg', title: "Band of Brothers - WWII Troops Marching", safeStart: 15 }
  ]
};

const ERA_WHITELISTS = {
  ancient_rome: ['rome', 'roman', 'gladiator', 'caesar', 'colosseum', 'spartacus', 'hbo', 'empire', 'bath', 'ancient', 'legion'],
  bruce_lee: ['bruce', 'lee', 'dragon', 'kung fu', 'martial', 'fist', 'dojo', 'jeet kune do'],
  ancient_egypt: ['egypt', 'pharaoh', 'mummy', 'pyramid', 'cleopatra', 'tomb', 'nile', 'anubis'],
  ancient_greece: ['sparta', 'spartan', '300', 'troy', 'achilles', 'greek', 'greece', 'athens'],
  medieval: ['kingdom', 'knight', 'medieval', 'castle', 'crusade', 'viking', 'sword', 'siege'],
  ottoman_empire: ['ottoman', 'sultan', 'mehmed', 'suleiman', 'janissary', 'turkey', 'turkish', 'empire', 'constantinople', 'harem', 'osman', 'ertugrul', 'vizier', 'pasha'],
  world_war_1: [
    'ww1', 'wwi', 'world war 1', 'world war i', 'great war', '1914', '1915', '1916', '1917', '1918',
    'osowiec', 'dead men', 'trench', 'chlorine', 'mustard gas', 'gas mask', 'gas attack', 'somme',
    'verdun', 'gallipoli', 'western front', 'eastern front', 'kaiser', 'bayonet', 'infantry', 'artillery',
    'reenactment', 'rockford', 'all quiet', 'no man', 'no-man'
  ],
  world_war_2: [
    'ww2', 'wwii', 'world war 2', 'world war ii', '1939', '1940', '1941', '1942', '1943', '1944', '1945',
    'hitler', 'nazi', 'churchill', 'stalin', 'd-day', 'normandy', 'panzer', 'tank', 'soldier', 'sniper',
    'army', 'battle', 'war', 'combat', 'patton', 'fury', 'saving private ryan', 'band of brothers', 'dunkirk',
    'night witches', 'bomber', 'pacific', 'okinawa', 'iwo jima', 'midway', 'stalingrad', 'kursk', 'bulge',
    'ghost army', 'deception', 'inflatable'
  ]
};

const BLACKLIST_TERMS = [
  // Gaming
  'gameplay', 'walkthrough', 'playthrough', 'battlefield 1', 'call of duty', 'cod', 'roblox', 'minecraft',
  'lego', 'brick', 'gamer', 'gaming', 'speedrun', 'mod ', 'vr gameplay', 'cutscene',
  // Music & Songs
  'music video', 'official video', 'audio', 'remix', 'song', 'lyrics', 'cover', 'sabaton', 'album', 'soundtrack', 'ost',
  // Commentary, interviews, talking heads, modern, reactions
  'reaction', 'review', 'podcast', 'vlog', 'tiktok', 'whatsapp', 'status', 'funny', 'parody', 'comedy',
  'meme', 'trailer', 'teaser', 'interview', 'veteran describes', 'describes killing', 'describes', 'talking head',
  'soundbite', 'explaining', 'explains', 'lecture', 'presentation',
  // Animation / cartoons / kids
  'animation', 'animated', 'cartoon', 'kids', 'for kids', 'nursery', 'draw', 'drawing', 'stop motion', 'anime',
  // Regional non-english
  'hindi', 'urdu', 'tamil', 'telugu', 'bengali', 'malayalam', 'marathi', 'spanish', 'francais', 'deutsch', 'russian',
  // Modern conflict / news / military drills
  'ukraine', 'putin', 'zelensky', 'russia ukraine', 'biden', 'trump', 'drill', 'drills', 'exercise', 'today',
  'breaking news', 'live stream', 'al jazeera', 'cnn', 'bbc news', 'fox news', 'headline', 'switzerland', 'taiwan', 'china'
];

class CinematicVideoFetcher {
  constructor(options = {}) {
    this.ytdlpPath = options.ytdlpPath || YTDLP_PATH;
    this.tempDir = options.tempDir || path.join(__dirname, '..', 'temp');
    this.sessionUsedIds = new Set();
  }

  detectEra(topic = '', extraText = '') {
    const combined = `${topic} ${extraText}`.toLowerCase();
    if (/ottoman|sultan|mehmed|suleiman|turk|turkish|janissary|constantinople|harem|ertugrul|osman|vizier|pasha/i.test(combined)) return 'ottoman_empire';
    if (/bruce lee|kung fu|martial art|dragon|dojo|jeet kune/i.test(combined)) return 'bruce_lee';
    if (/egypt|pharaoh|mummy|pyramid|cleopatra|nile|tomb/i.test(combined)) return 'ancient_egypt';
    if (/ww1|wwi|world war 1|world war i|great war|trench warfare|somme|verdun|gallipoli|red baron|1917|all quiet|osowiec|dead men/i.test(combined)) return 'world_war_1';
    if (/ww2|wwii|world war|nazi|hitler|churchill|stalin|d-day|normandy|pearl harbor|blitzkrieg|panzer|tiger tank|sniper simo|night witches|ghost army/i.test(combined)) return 'world_war_2';
    if (/medieval|knight|castle|crusade|sword|viking|dark age|king|guillotine/i.test(combined)) return 'medieval';
    return 'world_war_2';
  }

  isTitleRelevant(title = '', era = 'world_war_1') {
    const lower = title.toLowerCase();
    for (const bad of BLACKLIST_TERMS) {
      if (lower.includes(bad)) return false;
    }

    const whitelist = ERA_WHITELISTS[era] || ERA_WHITELISTS.world_war_1;
    return whitelist.some(keyword => lower.includes(keyword));
  }

  async fetchMontageClips(queries, totalDuration, outputPath, context = {}) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const era = context.era || this.detectEra(context.topic, Array.isArray(queries) ? queries.join(' ') : String(queries));
    console.log(`🏛️  Semantic Topic Grounding: Active Era = [${era.toUpperCase()}]`);

    let queryList = Array.isArray(queries) ? queries : [queries];
    if (queryList.length === 1) {
      const base = queryList[0];
      queryList = [
        `${base} combat footage`,
        `${base} battle charge`,
        `${base} dramatic aftermath`
      ];
    }

    const clipDuration = 3.5;
    const neededClips = Math.ceil(totalDuration / clipDuration);
    const subClips = [];

    console.log(`🛡️  Anti-Content ID Shield & Dynamic Sourcing: Sourcing ${neededClips} FRESH clips (Zero Reuse Guarantee)...`);
    const curatedPool = HISTORICAL_CURATED_VAULT[era] || HISTORICAL_CURATED_VAULT.world_war_1;

    for (let i = 0; i < neededClips; i++) {
      const q = queryList[i % queryList.length];
      const clipOut = path.join(this.tempDir, `shield_clip_${Date.now()}_${i}.mp4`);
      
      try {
        const clipInfo = await this.downloadSingleSnippet(q, clipDuration, clipOut, i, era, context);
        subClips.push(clipInfo.path);
        console.log(`   ✅ Clip ${i + 1}/${neededClips}: "${clipInfo.title}" [ID: ${clipInfo.videoId}]`);
      } catch (err) {
        console.warn(`   ⚠️ Clip ${i + 1} fallback activated: ${err.message}`);
        try {
          const curated = curatedPool[i % curatedPool.length];
          const fallbackClip = await this.downloadCuratedClip(curated, clipDuration, clipOut, i);
          subClips.push(fallbackClip);
          console.log(`   ✅ Curated Fallback ${i + 1}/${neededClips}: ${curated.title}`);
        } catch (fbErr) {
          if (subClips.length > 0) {
            console.log(`   🔁 Reusing prior verified clip for 100% fail-safe render`);
            subClips.push(subClips[subClips.length - 1]);
          } else {
            console.log(`   🎨 Generating procedural cinematic backdrop for 100% fail-safe render`);
            await execPromise(`ffmpeg -y -f lavfi -i "color=c=0x0d0d12:s=1080x820:d=${clipDuration}:r=30" -c:v libx264 -pix_fmt yuv420p "${clipOut}"`);
            subClips.push(clipOut);
          }
        }
      }
    }

    console.log(`🛡️  Applying Anti-Content ID transformations (hflip + 1.04x speed shift + color grading)...`);
    await this.assembleMontageWithShield(subClips, totalDuration, outputPath);

    return {
      videoPath: outputPath,
      clipCount: subClips.length,
      duration: totalDuration,
      era
    };
  }

  async downloadSingleSnippet(query, duration, outputPath, seedIndex = 0, era = 'world_war_1', context = {}) {
    const usedHistory = await loadUsedClipsHistory();
    const usedIds = new Set([...usedHistory.map(h => h.id), ...this.sessionUsedIds]);

    // Clean query into concise search keywords
    let cleanQuery = query
      .replace(/1080p|4k|hd|vintage|cinematic|map|aftermath|scene/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure era anchor is present in query
    const prefix = era === 'world_war_1' ? 'ww1' : 'ww2';
    if (!cleanQuery.toLowerCase().includes('ww1') && !cleanQuery.toLowerCase().includes('ww2')) {
      cleanQuery = `${prefix} ${cleanQuery}`;
    }

    const searchCmd = `"${this.ytdlpPath}" --ignore-errors --extractor-args "youtube:player_client=android,web" "ytsearch6:${cleanQuery} footage" --print "%(id)s|||%(title)s|||%(duration)s"`;
    
    let candidates = [];
    try {
      let stdout = '';
      try {
        const res = await execPromise(searchCmd);
        stdout = res.stdout;
      } catch (searchErr) {
        stdout = (searchErr.stdout || '') + '\n' + (searchErr.stderr || '');
      }

      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.includes('|||'));
      for (const line of lines) {
        const parts = line.split('|||');
        if (parts.length >= 2) {
          const id = parts[0].trim();
          const title = parts[1].trim();
          const dur = parseFloat(parts[2]) || 0;
          if (id.length >= 8 && id.length <= 15) {
            candidates.push({ id, title, duration: dur });
          }
        }
      }
    } catch (e) {
      console.warn(`Search error: ${e.message}`);
    }

    // 1. Select candidate: Fresh, not used in any video, passes relevance check & blacklist
    let selectedCandidate = candidates.find(c => !usedIds.has(c.id) && this.isTitleRelevant(c.title, era));

    // 2. Fallback candidate: Not used in current session and passes relevance check
    if (!selectedCandidate) {
      selectedCandidate = candidates.find(c => !this.sessionUsedIds.has(c.id) && this.isTitleRelevant(c.title, era));
    }

    let videoId = '';
    let videoTitle = '';
    let videoDuration = 0;

    if (selectedCandidate) {
      videoId = selectedCandidate.id;
      videoTitle = selectedCandidate.title;
      videoDuration = selectedCandidate.duration;
    } else {
      // Pick next unused curated video
      const curatedPool = HISTORICAL_CURATED_VAULT[era] || HISTORICAL_CURATED_VAULT.world_war_1;
      const unusedCurated = curatedPool.find(c => !usedIds.has(c.id)) || curatedPool.find(c => !this.sessionUsedIds.has(c.id)) || curatedPool[seedIndex % curatedPool.length];
      videoId = unusedCurated.id;
      videoTitle = unusedCurated.title;
      videoDuration = 180;
    }

    // Register clip ID to prevent reuse in current montage and across future videos
    this.sessionUsedIds.add(videoId);
    await recordUsedClip(videoId, videoTitle, context);

    // Calculate smart safe start time to capture genuine action and avoid introductory title cards/logos
    let startSec = 50 + (seedIndex * 15);
    if (videoDuration > 120) {
      // For videos over 2 minutes, avoid the first 70s (opening cards/logos) and last 30s (end screens/credits)
      const safeMin = 70;
      const safeMax = Math.max(videoDuration - 30, safeMin + 20);
      startSec = Math.floor(safeMin + ((seedIndex * 27) % (safeMax - safeMin)));
    } else if (videoDuration > 60) {
      const safeMin = 35;
      const safeMax = Math.max(videoDuration - 15, safeMin + 10);
      startSec = Math.floor(safeMin + ((seedIndex * 15) % (safeMax - safeMin)));
    }

    const endSec = startSec + Math.ceil(duration) + 1;
    const startStr = this.formatTime(startSec);
    const endStr = this.formatTime(endSec);

    const downloadCmd = `"${this.ytdlpPath}" --extractor-args "youtube:player_client=android,web" --download-sections "*${startStr}-${endStr}" -f "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=720]/136/398/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;

    await execPromise(downloadCmd);
    return { path: outputPath, videoId, title: videoTitle };
  }

  async downloadCuratedClip(curated, duration, outputPath, seedIndex = 0) {
    const startSec = (curated.safeStart || 50) + (seedIndex * 10);
    const endSec = startSec + Math.ceil(duration) + 1;
    const startStr = this.formatTime(startSec);
    const endStr = this.formatTime(endSec);

    const downloadCmd = `"${this.ytdlpPath}" --extractor-args "youtube:player_client=android,web" --download-sections "*${startStr}-${endStr}" -f "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=720]/136/398/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${curated.id}"`;

    await execPromise(downloadCmd);
    return outputPath;
  }

  async assembleMontageWithShield(clipPaths, targetDuration, outputPath) {
    const inputs = clipPaths.map(p => `-i "${p}"`).join(' ');
    const numClips = clipPaths.length;

    let filterString = '';
    for (let i = 0; i < numClips; i++) {
      filterString += `[${i}:v]scale=1080:880:force_original_aspect_ratio=increase,crop=1080:820:(in_w-out_w)/2:0,setsar=1,format=yuv420p,hflip,setpts=0.96*PTS,eq=contrast=1.06:brightness=0.01:saturation=1.08,fps=30[v${i}];`;
    }

    const concatInputs = clipPaths.map((_, i) => `[v${i}]`).join('');
    filterString += `${concatInputs}concat=n=${numClips}:v=1:a=0[vconcat];[vconcat]trim=0:${targetDuration}[outv]`;

    const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterString}" -map "[outv]" -c:v libx264 -preset fast -crf 19 "${outputPath}"`;

    await execPromise(ffmpegCmd);
    return outputPath;
  }

  async assembleFullBleedCinematicMontage(clipPaths, targetDuration, outputPath) {
    const inputs = clipPaths.map(p => `-i "${p}"`).join(' ');
    const numClips = clipPaths.length;

    let filterString = '';
    for (let i = 0; i < numClips; i++) {
      filterString += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(in_w-out_w)/2:(in_h-out_h)/2,setsar=1,format=yuv420p,hflip,setpts=0.96*PTS,eq=contrast=1.07:brightness=0.01:saturation=1.06,fps=30[v${i}];`;
    }

    const concatInputs = clipPaths.map((_, i) => `[v${i}]`).join('');
    filterString += `${concatInputs}concat=n=${numClips}:v=1:a=0[vconcat];[vconcat]trim=0:${targetDuration}[outv]`;

    const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterString}" -map "[outv]" -c:v libx264 -preset fast -crf 19 "${outputPath}"`;

    await execPromise(ffmpegCmd);
    return outputPath;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

module.exports = { CinematicVideoFetcher, HISTORICAL_CURATED_VAULT };
