const OpenAI = require('openai');
require('dotenv').config();

/**
 * CURATED OUTLIER BENCHMARKS
 * Strictly focused on World War 1, World War 2, and American War History.
 */
const VIRAL_RESEARCH_BENCHMARKS = [
  // --- WORLD WAR 2 ---
  {
    topic: "The Ghost Army: WWII's Secret Rubber Decoy Division",
    era: "world_war_2",
    theme: "1,100 artists, inflatable Sherman tanks, sonic deception loudspeakers, phantom divisions"
  },
  {
    topic: "Operation Mincemeat: The Dead Tramp Who Fooled Hitler",
    era: "world_war_2",
    theme: "Corpse in Royal Marines uniform, bogus invasion documents, submarine launch off Spain"
  },
  {
    topic: "The Battle of Castle Itter: When Americans and Germans Fought the SS Together",
    era: "world_war_2",
    theme: "US Sherman tank crew and anti-Nazi Wehrmacht soldiers defending Austrian castle"
  },
  {
    topic: "Simo Häyhä (The White Death): 505 Kills in -40°C Without a Scope",
    era: "world_war_2",
    theme: "Snow packed in mouth to hide breath, iron sights only, invisible ghost sniper"
  },
  {
    topic: "The Submarine That Torpedoed a Train: USS Barb's Sabotage on Land",
    era: "world_war_2",
    theme: "Submarine crew rowing rubber raft ashore to plant 55-lb micro-switch landmine under train tracks"
  },
  {
    topic: "The Night Witches: Soviet Female Pilots Who Cut Their Engines in the Dark",
    era: "world_war_2",
    theme: "Plywood Po-2 biplanes, gliding in total darkness, whooshing sound of broomsticks"
  },
  {
    topic: "Audie Murphy: The 19-Year-Old Who Held Off a Company From a Burning Tank",
    era: "world_war_2",
    theme: "Climbing aboard burning M10 tank destroyer, firing .50 caliber machine gun while wounded"
  },
  {
    topic: "Navajo Code Talkers: The Only Military Code Never Broken in History",
    era: "world_war_2",
    theme: "Unwritten Native American language adapted into unbreakable battlefield radio cipher"
  },
  {
    topic: "John Basilone: The Marine Who Repelled 3,000 Soldiers at Guadalcanal",
    era: "world_war_2",
    theme: "Dual Browning machine guns, barehanded barrel swaps, holding the line for 3 days"
  },
  {
    topic: "Operation Fortitude: Patton's Phantom Army That Saved D-Day",
    era: "world_war_2",
    theme: "Dummy aircraft bases, fake radio chatter, deceiving German High Command at Pas-de-Calais"
  },
  {
    topic: "The Doolittle Raid: B-25 Bombers Taking Off From an Aircraft Carrier",
    era: "world_war_2",
    theme: "USS Hornet carrier flight deck, stripped-down twin-engine bombers striking Tokyo"
  },
  {
    topic: "The Tuskegee Airmen: The Red Tails Who Defied All Odds Over Europe",
    era: "world_war_2",
    theme: "Distinctive red-tailed P-51 Mustangs escorting B-17 bombers deep into Nazi Germany"
  },

  // --- WORLD WAR 1 ---
  {
    topic: "The Attack of the Dead Men: Chemical Gas Survivors Charging in Blood Rags",
    era: "world_war_1",
    theme: "Osowiec fortress, chlorine gas, Russian survivors spitting lungs, terrified Germans fleeing"
  },
  {
    topic: "The Harlem Hellfighters: Henry Johnson's Solo Stand Against 24 German Raiders",
    era: "world_war_1",
    theme: "Bolo knife and jammed rifle in Argonne forest, saving fellow wounded soldier"
  },
  {
    topic: "Alvin York: The Pacifist Farmer Who Captured 132 Germans Single-Handedly",
    era: "world_war_1",
    theme: "Turkey-shoot marksmanship, taking out machine gun nests, marching 132 prisoners back"
  },
  {
    topic: "Cher Ami: The One-Eyed, One-Legged Pigeon Who Saved the Lost Battalion",
    era: "world_war_1",
    theme: "Shot through the breast, delivering message across 25 miles through shrapnel and gas"
  },
  {
    topic: "The Christmas Truce of 1914: When Enemies Laid Down Arms for Carols",
    era: "world_war_1",
    theme: "Silent Night sung across No Man's Land, exchanging cigarettes, impromptu soccer in mud"
  },
  {
    topic: "The Lost Battalion: 554 Americans Surrounded in the Argonne Forest",
    era: "world_war_1",
    theme: "Major Whittlesey holding the Charlevaux ravine with zero food or medical supplies"
  },

  // --- AMERICAN WARS & MILITARY FEATS ---
  {
    topic: "CSS Hunley: The Civil War Submarine That Sank a Warship and Vanished",
    era: "american_civil_war",
    theme: "Hand-cranked iron submarine, spar torpedo attack on USS Housatonic, mysterious vanishing"
  },
  {
    topic: "The Great Locomotive Chase: Union Spies Stealing a Confederate Train",
    era: "american_civil_war",
    theme: "Andrews Raiders hijacking locomotive 'The General', high-speed backward chase on rails"
  },
  {
    topic: "Harriet Tubman's Combahee River Raid: The First Woman to Lead an Armed Assault",
    era: "american_civil_war",
    theme: "Guiding Union gunboats past Confederate river mines, liberating over 700 enslaved people"
  },
  {
    topic: "The Culper Spy Ring: Washington's Secret Network That Won the Revolution",
    era: "american_revolution",
    theme: "Invisible ink, codebook 711, clothesline signals in Long Island, saving French fleet"
  },
  {
    topic: "Daniel Morgan's Double Envelopment: The Tactical Miracle of Cowpens",
    era: "american_revolution",
    theme: "Sharpshooters firing two shots then retreating, drawing British infantry into cavalry trap"
  },
  {
    topic: "Operation Paul Bunyan: When the US Sent 800 Troops and B-52s to Cut One Tree",
    era: "american_wars",
    theme: "Korean DMZ tree-cutting mission backed by aircraft carriers, B-52 bombers, and Cobra gunships"
  }
];

class DeepResearchEngine {
  constructor(options = {}) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required for DeepResearchEngine');
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });
    this.model = options.model || 'qwen/qwen3.8-27b';
  }

  /**
   * Conducts deep-dive historical research and scripts a 60-second viral Short.
   * Strictly focused on WW1, WW2, and American Wars.
   * @param {string|null} customTopic - Optional custom topic or null to pick an outlier.
   * @returns {Promise<Object>} Deep research dossier with 8-10 visual scenes.
   */
  async researchAndScriptShort(customTopic = null) {
    const selectedBenchmark = VIRAL_RESEARCH_BENCHMARKS[Math.floor(Math.random() * VIRAL_RESEARCH_BENCHMARKS.length)];
    const topicToResearch = customTopic || selectedBenchmark.topic;

    console.log(`\n🔎 [DeepResearchEngine] Initiating deep-dive research into: "${topicToResearch}"...`);

    const systemPrompt = `You are the Lead Historical Forensic Researcher and Master Documentary Scriptwriter for "The History Uncut", an elite YouTube Shorts channel dedicated strictly to World War 1, World War 2, and American War History (Civil War, Revolution, legendary US military feats).

STRICT CHANNEL SCOPE:
- World War 1 (WW1)
- World War 2 (WW2)
- American Wars (American Civil War, American Revolution, US Military Outlier Operations)

BENCHMARK PRODUCTION QUALITY (Ghost Army standard):
1. PACING: Unhurried, deep, authoritative narration (approx 125-140 words total, fits 55-60 seconds).
2. 0-3s IMPOSSIBLE HOOK: Immediately shocks the viewer with a paradoxical historical truth.
3. STORY ARC: 8 chronological visual scenes (each 5-6s) showing real tactics, authentic names, and locations.
4. CLIFFHANGER ENDING: Concludes with a chilling philosophical insight or open cognitive loop that provokes comments and re-watches. NO desperate "subscribe" pleas in the spoken script.

VIDIQ & YOUTUBE SHORTS SEO REQUIREMENTS:
1. TITLE:
   - Must be HIGH CTR, curiosity-driven, and punchy.
   - EXACT LENGTH: 45 to 65 characters total (MUST include "#shorts").
   - NEVER exceed 70 characters (prevents truncation on mobile screens).
   - Example: "The WW2 Ghost Army That Fooled Hitler #shorts" (46 chars)
   - Example: "The Dead Men Who Kept Fighting in WW1 #shorts" (45 chars)
2. DESCRIPTION:
   - 2-3 engaging sentences explaining the historical context and search keywords.
   - Clear brand call to action: "Subscribe to @HistoryUncutUS for daily untold war stories and legendary historical feats."
   - 5-6 high-volume hashtags: "#shorts #history #ww2 #ww1 #americanhistory #thehistoryuncut #militaryhistory"
3. TAGS:
   - 15 to 20 search-optimized keyword tags covering the exact event, units, key figures, and broad categories (e.g. "ww2 history", "ww1", "military history", "the history uncut", "war documentary"). Total tag length between 350 and 450 characters.

OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema:
{
  "topic": "Concise historical event title",
  "era": "world_war_2" or "world_war_1" or "american_civil_war" or "american_wars",
  "hook": "The opening 3-second hook sentence",
  "voiceScript": "The complete spoken script (125-140 words)",
  "visualQueries": [
    "Specific 1080p archival combat search query 1",
    "Specific 1080p military search query 2",
    "Specific 1080p battlefield search query 3",
    "Specific 1080p tactical action search query 4",
    "Specific 1080p archival footage search query 5",
    "Specific 1080p military search query 6",
    "Specific 1080p archival aftermath search query 7",
    "Specific 1080p dramatic closing search query 8"
  ],
  "title": "Punchy Title Under 65 Chars With #shorts",
  "description": "Engaging description with keywords, channel CTA, and 5 hashtags",
  "tags": ["15", "to", "20", "vidIQ", "optimized", "tags"]
}`;

    const userPrompt = `Conduct deep forensic historical research on: "${topicToResearch}".
Uncover the exact psychological mechanisms, secret deceptions, and untold grit. Craft the master 60-second documentary script, scene breakdown, and vidIQ-optimized metadata.`;

    const response = await this.client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 950,
      temperature: 0.65
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    // Enforce vidIQ character limit safety on title
    if (parsed.title) {
      let cleanTitle = parsed.title.trim();
      if (!cleanTitle.includes('#shorts')) {
        cleanTitle += ' #shorts';
      }
      if (cleanTitle.length > 70) {
        // Trim gracefully while keeping #shorts
        const maxBase = 70 - ' #shorts'.length;
        cleanTitle = cleanTitle.replace(/#shorts/g, '').trim().slice(0, maxBase).trim() + ' #shorts';
      }
      parsed.title = cleanTitle;
    }

    console.log(`✅ [DeepResearchEngine] Research complete: "${parsed.title}" (Chars: ${parsed.title.length}, Visual Queries: ${parsed.visualQueries?.length || 0})`);
    return parsed;
  }
}

module.exports = { DeepResearchEngine, VIRAL_RESEARCH_BENCHMARKS };
