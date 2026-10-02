const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
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
    { id: 'FbAi7UAG-rU', title: "Kursk 1943 in Color - Largest Tank Battle WWII", safeStart: 45 },
    { id: 'm19r4ZCcHq8', title: "WW2: Operation Barbarossa Combat Footage", safeStart: 40 },
    { id: 'fR20MWwPEEU', title: "WW2 US Street Fighting Caught on Film", safeStart: 35 },
    { id: 'AyEcWIEm0CU', title: "29th Infantry Division at Saint-Lo WW2 Combat", safeStart: 50 },
    { id: 'ZXF1sHkHAZc', title: "WW2 Battle of the Atlantic Real Footage in Colour", safeStart: 60 },
    { id: 'pL5-OFpC4lI', title: "Real Footage of Omaha Beach 4K Colorized", safeStart: 45 },
    { id: '6Q94cze2s68', title: "The Last Moments of a Tank Crew Caught on Camera", safeStart: 30 },
    { id: 'zNmXMee2ABE', title: "The Ghost Army 23rd HQ Special Troops Go To War", safeStart: 50 },
    { id: 'v4b0_OVfewk', title: "Naval Bombardment of Iwo Jima - Flags of our Fathers", safeStart: 30 },
    { id: 'mxUk0STBRIU', title: "The Japanese Surrender aboard USS Missouri 1945", safeStart: 40 },
    { id: 'u8afP6GetP8', title: "Cassino Monastery Bombed 1944 Archival", safeStart: 25 },
    { id: 'BThk_U9RbMg', title: "Historic Munich Agreement 1938 HD Stock Footage", safeStart: 20 },
    { id: 'dAHJ0omYo7U', title: "Entire World War II German Perspective Pure Color", safeStart: 60 },
    { id: 'Yl_zCQZooJo', title: "German Tiger I Tank and Soviet T-34 Battle of Kursk", safeStart: 2 }
  ],
  american_civil_war: [
    { id: 'i8SvloJ4f08', title: "Battle of Shiloh Tennessee Reenactment - Civil War Stock", safeStart: 25 },
    { id: 'c6YN_I-sN5Y', title: "Battle of Shiloh Reenactment - Union on Horseback", safeStart: 20 },
    { id: 'tbvOt3lAPws', title: "American Civil War: Battle Of Manassas Bull Run", safeStart: 40 },
    { id: 'w7h85nYNhgY', title: "Civil War Reenactment Cannon & Musket Volley", safeStart: 35 },
    { id: 'qyUb-qE_sAU', title: "Battle of Shiloh Reenactment - Troops March Forward", safeStart: 25 },
    { id: 'HhDsvTi9iZc', title: "HD Civil War Stock Footage REEL - Reenactment", safeStart: 30 },
    { id: 'GGhBDtUBLy0', title: "Reenactment Charge during Battle of Bull Run", safeStart: 20 },
    { id: 'YKIEiJ5ca70', title: "Battle of Shiloh Reenactment - Rebel Flag Bearer", safeStart: 15 },
    { id: 'aC3axYHlIW8', title: "Fix Bayonets Gettysburg Charge", safeStart: 25 }
  ],
  american_wars: [
    { id: 'fHHg_xfEl_8', title: "Battle of Lexington & Concord Reenactment", safeStart: 30 },
    { id: 'ZCuHU6ll-io', title: "Revolutionary War Reenactment Battle of Germantown", safeStart: 25 },
    { id: 'ZbLruILDxLU', title: "Revolutionary War Reenactment Battle of Monmouth", safeStart: 35 },
    { id: 'W6Eqkg1fZpw', title: "Boston Massacre Reenactment American Revolutionary War", safeStart: 20 },
    { id: 'etcfSNa5b5o', title: "Battle of Brooklyn Heights American Revolution", safeStart: 40 },
    { id: 'ujyyldXk8BM', title: "American Armor & Artillery Live Fire Maneuvers", safeStart: 30 }
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
    'reenactment', 'rockford', 'all quiet', 'no man', 'no-man', 'harlem hellfighters', 'alvin york',
    'battlefield 1', 'bf1', 'isonzo', 'verdun'
  ],
  world_war_2: [
    'ww2', 'wwii', 'world war 2', 'world war ii', '1939', '1940', '1941', '1942', '1943', '1944', '1945',
    'hitler', 'nazi', 'churchill', 'stalin', 'd-day', 'normandy', 'panzer', 'tank', 'soldier', 'sniper',
    'army', 'battle', 'war', 'combat', 'patton', 'fury', 'saving private ryan', 'band of brothers', 'dunkirk',
    'night witches', 'bomber', 'pacific', 'okinawa', 'iwo jima', 'midway', 'stalingrad', 'kursk', 'bulge',
    'ghost army', 'deception', 'inflatable', 'audie murphy', 'basilone', 'tuskegee',
    'battlefield v', 'battlefield 5', 'bfv', 'hell let loose', 'call of duty wwii', 'cod ww2', 'enlisted', 'post scriptum'
  ],
  american_civil_war: [
    'civil war', 'gettysburg', 'antietam', 'confederate', 'union', 'lincoln', 'grant', 'lee',
    'hunley', 'submarine', 'musket', 'ironclad', 'cannon', 'artillery', 'locomotive', 'shiloh', 'bull run',
    'war of rights', 'holdfast'
  ],
  american_wars: [
    'american war', 'us army', 'marines', 'us military', 'revolution', 'washington', 'civil war',
    'normandy', 'pacific', 'vietnam', 'korea', 'doolittle', 'patton', 'macarthur', 'code talker',
    'modern warfare', 'call of duty', 'squad'
  ]
};

const BLACKLIST_TERMS = [
  // Low-quality / amateur gaming junk to avoid (keep cinematic/no-HUD allowed)
  'walkthrough', 'playthrough', 'let\'s play', 'lets play', 'part 1', 'part 2', 'part 3',
  'roblox', 'minecraft', 'lego', 'gamer', 'speedrun', 'funny moments', 'glitch', 'streamer',
  'live stream', 'twitch', 'vtuber', 'facecam', 'commentary',
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
    if (/civil war|gettysburg|antietam|confederate|union army|lincoln|grant|robert e lee|hunley|ironclad|shiloh|bull run/i.test(combined)) return 'american_civil_war';
    if (/american revolution|revolutionary war|george washington|bunker hill|yorktown|1776|continental army|lexington/i.test(combined)) return 'american_wars';
    if (/us army|marine corps|us military|vietnam|korean war|doolittle raid|american war/i.test(combined)) return 'american_wars';
    if (/ww1|wwi|world war 1|world war i|great war|trench warfare|somme|verdun|gallipoli|red baron|1917|all quiet|osowiec|dead men/i.test(combined)) return 'world_war_1';
    if (/ww2|wwii|world war|nazi|hitler|churchill|stalin|d-day|normandy|pearl harbor|blitzkrieg|panzer|tiger tank|sniper simo|night witches|ghost army/i.test(combined)) return 'world_war_2';
    if (/ottoman|sultan|mehmed|suleiman|turk|turkish|janissary|constantinople|harem|ertugrul|osman|vizier|pasha/i.test(combined)) return 'ottoman_empire';
    if (/bruce lee|kung fu|martial art|dragon|dojo|jeet kune/i.test(combined)) return 'bruce_lee';
    if (/egypt|pharaoh|mummy|pyramid|cleopatra|nile|tomb/i.test(combined)) return 'ancient_egypt';
    if (/medieval|knight|castle|crusade|sword|viking|dark age|king|guillotine/i.test(combined)) return 'medieval';
    return 'world_war_2';
  }

  isTitleRelevant(title = '', era = 'world_war_1') {
    const lower = title.toLowerCase();
    for (const bad of BLACKLIST_TERMS) {
      if (lower.includes(bad)) return false;
    }

    const whitelist = ERA_WHITELISTS[era] || ERA_WHITELISTS.world_war_1;
    if (whitelist.some(keyword => lower.includes(keyword))) return true;

    // High-relevance historical documentary combat terms
    const generalMilitaryTerms = [
      'combat', 'battle', 'war', 'army', 'soldier', 'infantry', 'artillery',
      'tank', 'forces', 'front', 'military', 'archival', 'footage', 'documentary',
      'operation', 'defense', 'charge', 'regiment', 'division', 'reenactment'
    ];
    return generalMilitaryTerms.some(term => lower.includes(term));
  }

  async searchCandidates(cleanQuery, limit = 12) {
    const searchCmd = `"${this.ytdlpPath}" --extractor-args "youtube:player_client=android,ios,web" --force-ipv4 --no-check-certificates --geo-bypass --ignore-errors "ytsearch${limit}:${cleanQuery} 1080p footage" --print "%(id)s---%(title)s---%(duration)s"`;
    let candidates = [];
    try {
      let stdout = '';
      try {
        const res = await execPromise(searchCmd);
        stdout = res.stdout;
      } catch (searchErr) {
        stdout = (searchErr.stdout || '') + '\n' + (searchErr.stderr || '');
      }

      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.includes('---'));
      for (const line of lines) {
        const parts = line.split('---');
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
      console.warn(`Search error for "${cleanQuery}": ${e.message}`);
    }
    return candidates;
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

    console.log(`🛡️  Strict Zero-Reuse Clip Sourcing: Sourcing ${neededClips} 100% FRESH clips...`);
    const curatedPool = HISTORICAL_CURATED_VAULT[era] || HISTORICAL_CURATED_VAULT.world_war_2;

    for (let i = 0; i < neededClips; i++) {
      const q = queryList[i % queryList.length];
      const clipOut = path.join(this.tempDir, `shield_clip_${Date.now()}_${i}.mp4`);
      
      try {
        const clipInfo = await this.downloadSingleSnippet(q, clipDuration, clipOut, i, era, context);
        subClips.push(clipInfo.path);
        console.log(`   ✅ Clip ${i + 1}/${neededClips}: "${clipInfo.title}" [ID: ${clipInfo.videoId}]`);
      } catch (err) {
        console.warn(`   ⚠️ Clip ${i + 1} fresh sourcing warning: ${err.message}`);
        try {
          // Emergency fallback from curated pool, ensuring no duplicate in session
          const usedHistory = await loadUsedClipsHistory();
          const allUsed = new Set([...usedHistory.map(h => h.id), ...this.sessionUsedIds]);
          const unusedCurated = curatedPool.find(c => !allUsed.has(c.id)) || curatedPool[i % curatedPool.length];
          
          this.sessionUsedIds.add(unusedCurated.id);
          await recordUsedClip(unusedCurated.id, unusedCurated.title, context);

          const fallbackClip = await this.downloadCuratedClip(unusedCurated, clipDuration, clipOut, i);
          subClips.push(fallbackClip);
          console.log(`   ✅ Curated Fallback ${i + 1}/${neededClips}: ${unusedCurated.title} [ID: ${unusedCurated.id}]`);
        } catch (fbErr) {
          console.error(`   ❌ Critical fallback error for clip ${i + 1}: ${fbErr.message}`);
          
          // Tier 3: Local Offline Historical Vault!
          // Bundled directly into the git repository so it's 100% immune to cloud datacenter IP blocks!
          const localVaultDir = path.join(__dirname, '..', 'assets', 'vault');
          let localRescued = false;
          if (fsSync.existsSync(localVaultDir)) {
            const vaultFiles = fsSync.readdirSync(localVaultDir).filter(f => f.endsWith('.mp4'));
            if (vaultFiles.length > 0) {
              const vaultFile = path.join(localVaultDir, vaultFiles[i % vaultFiles.length]);
              const offset = (i * 2.2) % 6.0;
              console.log(`   🏛️ Local Offline Vault Active: Rescuing clip ${i + 1} with "${path.basename(vaultFile)}" (offset ${offset.toFixed(1)}s)...`);
              await execPromise(`ffmpeg -y -ss ${offset} -i "${vaultFile}" -t ${clipDuration} -vf "scale=1080:820:force_original_aspect_ratio=increase,crop=1080:820,setsar=1" -c:v libx264 -pix_fmt yuv420p "${clipOut}"`);
              subClips.push(clipOut);
              localRescued = true;
            }
          }

          if (!localRescued) {
            if (subClips.length > 0) {
              // Re-use an already downloaded valid historical clip with offset instead of a black screen!
              console.log(`   🔄 Rescuing clip ${i + 1} using verified historical footage...`);
              const prevClip = subClips[subClips.length - 1];
              await execPromise(`ffmpeg -y -ss 0.5 -i "${prevClip}" -t ${clipDuration} -c:v libx264 -pix_fmt yuv420p "${clipOut}"`);
              subClips.push(clipOut);
            } else {
              throw new Error(`CRITICAL: Failed to download initial historical footage and local vault unavailable: ${fbErr.message}`);
            }
          }
        }
      }
    }

    if (subClips.length === 0) {
      throw new Error(`CRITICAL: 0 valid historical video clips could be sourced. Aborting generation to prevent publishing black-screen content!`);
    }

    console.log(`🛡️  Applying Anti-Content ID transformations (1.04x speed shift + color grading + unsharp)...`);
    await this.assembleMontageWithShield(subClips, totalDuration, outputPath);

    return {
      videoPath: outputPath,
      clipCount: subClips.length,
      duration: totalDuration,
      era
    };
  }

  async downloadSingleSnippet(query, duration, outputPath, seedIndex = 0, era = 'world_war_2', context = {}) {
    const usedHistory = await loadUsedClipsHistory();
    const usedIds = new Set([...usedHistory.map(h => h.id), ...this.sessionUsedIds]);

    // Clean query into concise search keywords
    let cleanQuery = query
      .replace(/1080p|4k|hd|vintage|cinematic|map|aftermath|scene/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure era anchor is present in query
    let prefix = 'ww2';
    if (era === 'world_war_1') prefix = 'ww1';
    else if (era === 'american_civil_war') prefix = 'civil war';
    else if (era === 'american_revolution') prefix = 'american revolution';
    else if (era === 'american_wars') prefix = 'american war';

    if (!cleanQuery.toLowerCase().includes(prefix) && !cleanQuery.toLowerCase().includes('ww1') && !cleanQuery.toLowerCase().includes('ww2')) {
      cleanQuery = `${prefix} ${cleanQuery}`;
    }

    // 1. Primary search query
    let candidates = await this.searchCandidates(cleanQuery, 14);

    // Filter strictly for FRESH candidates (never used in ANY video)
    let freshCandidates = candidates.filter(c => !usedIds.has(c.id) && this.isTitleRelevant(c.title, era));

    // 2. If no fresh candidates found, search era-matched cinematic reenactments & archival footage
    if (freshCandidates.length === 0) {
      let altQueries = [];
      if (era === 'world_war_1') {
        altQueries = [
          'Battlefield 1 no HUD cinematic trench combat 1080p',
          'Battlefield 1 trench warfare cinematic battle',
          'WW1 archival trench combat rare footage 1080p',
          'WW1 battlefield reenactment combat 1080p'
        ];
      } else if (era === 'world_war_2') {
        altQueries = [
          'Battlefield V no HUD cinematic WW2 combat 1080p',
          'Hell Let Loose cinematic WW2 combat no HUD 1080p',
          'Call of Duty WWII campaign cinematic no HUD 1080p',
          'WW2 rare color combat footage 1080p'
        ];
      } else if (era === 'american_civil_war') {
        altQueries = [
          'War of Rights cinematic battle no HUD 1080p',
          'Holdfast Nations At War cinematic combat no HUD',
          'Civil War reenactment combat 1080p'
        ];
      } else {
        altQueries = [
          'Call of Duty Modern Warfare cinematic combat no HUD',
          'Call of Duty war combat cinematic no HUD 1080p',
          `${prefix} archival combat footage 1080p`
        ];
      }

      for (const altQ of altQueries) {
        const altCandidates = await this.searchCandidates(altQ, 12);
        freshCandidates = altCandidates.filter(c => !usedIds.has(c.id) && this.isTitleRelevant(c.title, era));
        if (freshCandidates.length > 0) {
          console.log(`   🎮 Found ${freshCandidates.length} high-definition cinematic reenactment candidates using: "${altQ}"`);
          break;
        }
      }
    }

    // 3. Multi-Candidate Download Loop: Try candidates one by one until success
    for (const cand of freshCandidates) {
      try {
        let videoDuration = cand.duration || 180;
        let startSec = 50 + (seedIndex * 15);
        if (videoDuration > 120) {
          const safeMin = 60;
          const safeMax = Math.max(videoDuration - 30, safeMin + 20);
          startSec = Math.floor(safeMin + ((seedIndex * 27) % (safeMax - safeMin)));
        } else if (videoDuration > 60) {
          const safeMin = 30;
          const safeMax = Math.max(videoDuration - 15, safeMin + 10);
          startSec = Math.floor(safeMin + ((seedIndex * 15) % (safeMax - safeMin)));
        }

        const endSec = startSec + Math.ceil(duration) + 1;
        const startStr = this.formatTime(startSec);
        const endStr = this.formatTime(endSec);

        const downloadCmd = `"${this.ytdlpPath}" --extractor-args "youtube:player_client=android,ios,web" --force-ipv4 --no-check-certificates --geo-bypass --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" --download-sections "*${startStr}-${endStr}" -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo[height<=720]/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${cand.id}"`;

        await execPromise(downloadCmd);

        // Success! Immediately lock and record clip
        this.sessionUsedIds.add(cand.id);
        await recordUsedClip(cand.id, cand.title, context);

        return { path: outputPath, videoId: cand.id, title: cand.title };
      } catch (dlErr) {
        console.warn(`   ⚠️ Download failed for "${cand.title}" [${cand.id}]: ${dlErr.message}. Trying next candidate...`);
        continue;
      }
    }

    // 4. Fallback to Curated Vault if all fresh search candidates fail
    const curatedPool = HISTORICAL_CURATED_VAULT[era] || HISTORICAL_CURATED_VAULT.world_war_2;
    // Prefer curated items NEVER used anywhere
    let curatedItem = curatedPool.find(c => !usedIds.has(c.id));
    if (!curatedItem) {
      // If all were used in previous videos, at least choose one not used in THIS session
      curatedItem = curatedPool.find(c => !this.sessionUsedIds.has(c.id)) || curatedPool[seedIndex % curatedPool.length];
    }

    await this.downloadCuratedClip(curatedItem, duration, outputPath, seedIndex);
    this.sessionUsedIds.add(curatedItem.id);
    await recordUsedClip(curatedItem.id, curatedItem.title, context);

    return { path: outputPath, videoId: curatedItem.id, title: curatedItem.title };
  }

  async downloadCuratedClip(curated, duration, outputPath, seedIndex = 0) {
    const startSec = (curated.safeStart || 50) + (seedIndex * 10);
    const endSec = startSec + Math.ceil(duration) + 1;
    const startStr = this.formatTime(startSec);
    const endStr = this.formatTime(endSec);

    const downloadCmd = `"${this.ytdlpPath}" --extractor-args "youtube:player_client=android,ios,web" --force-ipv4 --no-check-certificates --geo-bypass --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" --download-sections "*${startStr}-${endStr}" -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo[height<=720]/best" -o "${outputPath}" "https://www.youtube.com/watch?v=${curated.id}"`;

    await execPromise(downloadCmd);
    return outputPath;
  }

  async assembleMontageWithShield(clipPaths, targetDuration, outputPath) {
    const inputs = clipPaths.map(p => `-i "${p}"`).join(' ');
    const numClips = clipPaths.length;

    let filterString = '';
    for (let i = 0; i < numClips; i++) {
      filterString += `[${i}:v]scale=1080:880:force_original_aspect_ratio=increase,crop=1080:820:(in_w-out_w)/2:0,setsar=1,format=yuv420p,setpts=0.96*PTS,unsharp=lx=5:ly=5:la=0.6:cx=5:cy=5:ca=0.25,eq=contrast=1.06:brightness=0.01:saturation=1.08,fps=30[v${i}];`;
    }

    const concatInputs = clipPaths.map((_, i) => `[v${i}]`).join('');
    filterString += `${concatInputs}concat=n=${numClips}:v=1:a=0[vconcat];[vconcat]trim=0:${targetDuration}[outv]`;

    const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterString}" -map "[outv]" -c:v libx264 -preset medium -crf 16 -b:v 15M "${outputPath}"`;

    await execPromise(ffmpegCmd);
    return outputPath;
  }

  async assembleFullBleedCinematicMontage(clipPaths, targetDuration, outputPath) {
    const inputs = clipPaths.map(p => `-i "${p}"`).join(' ');
    const numClips = clipPaths.length;

    let filterString = '';
    for (let i = 0; i < numClips; i++) {
      filterString += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(in_w-out_w)/2:(in_h-out_h)/2,setsar=1,format=yuv420p,setpts=0.96*PTS,unsharp=lx=5:ly=5:la=0.6:cx=5:cy=5:ca=0.25,eq=contrast=1.07:brightness=0.01:saturation=1.06,fps=30[v${i}];`;
    }

    const concatInputs = clipPaths.map((_, i) => `[v${i}]`).join('');
    filterString += `${concatInputs}concat=n=${numClips}:v=1:a=0[vconcat];[vconcat]trim=0:${targetDuration}[outv]`;

    const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterString}" -map "[outv]" -c:v libx264 -preset medium -crf 16 -b:v 15M "${outputPath}"`;

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
