const OpenAI = require('openai');
require('dotenv').config();

const VIRAL_RESEARCH_BENCHMARKS = [
  {
    topic: "Operation Mincemeat: The Dead Tramp Who Fooled Hitler",
    era: "world_war_2",
    theme: "Psychological deception, corpse in uniform, false invasion plans"
  },
  {
    topic: "The Ghost Army: WWII's Secret Rubber Decoy Division",
    era: "world_war_2",
    theme: "Inflatable tanks, sonic deception, phantom divisions"
  },
  {
    topic: "The Night Witches: Soviet Female Pilots Who Cut Their Engines in the Dark",
    era: "world_war_2",
    theme: "Plywood biplanes, silent gliding terror, psychological dread"
  },
  {
    topic: "The Battle of Castle Itter: When Americans and Germans Fought Together",
    era: "world_war_2",
    theme: "Wehrmacht and US soldiers teaming up to defend French VIPs from SS"
  },
  {
    topic: "Simo Häyhä (The White Death): 505 Kills in -40°C Without a Scope",
    era: "world_war_2",
    theme: "Snow in mouth to hide breath, iron sights only, invisible ghost"
  },
  {
    topic: "The Attack of the Dead Men: Chemical Gas Survivors Charging in Blood Rags",
    era: "world_war_1",
    theme: "Osowiec fortress, chlorine gas, psychological terror of retreating Germans"
  },
  {
    topic: "Operation Fortitude: Patton's Phantom Army with Inflatable Aircraft and False Radio",
    era: "world_war_2",
    theme: "D-Day deception, double cross network, Pas-de-Calais ruse"
  },
  {
    topic: "The Submarine That Torpedoed a Train: USS Barb's Sabotage on Land",
    era: "world_war_2",
    theme: "Submarine crew planting landmines on coastal rail tracks in Japan"
  },
  {
    topic: "The Pigeon-Guided Missiles: Project Pigeon's Secret WW2 Gliders",
    era: "world_war_2",
    theme: "B.F. Skinner training pigeons to steer glide bombs by pecking target"
  },
  {
    topic: "The Harlem Hellfighters: 191 Days on the Frontline Without Giving Up an Inch",
    era: "world_war_1",
    theme: "Fiercest combat unit, Henry Johnson single-handedly holding off German raid"
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
   * @param {string|null} customTopic - Optional custom topic or null to pick an outlier.
   * @returns {Promise<Object>} Deep research dossier with 10 visual scenes.
   */
  async researchAndScriptShort(customTopic = null) {
    const selectedBenchmark = VIRAL_RESEARCH_BENCHMARKS[Math.floor(Math.random() * VIRAL_RESEARCH_BENCHMARKS.length)];
    const topicToResearch = customTopic || selectedBenchmark.topic;

    console.log(`\n🔎 [DeepResearchEngine] Initiating deep-dive research into: "${topicToResearch}"...`);

    const systemPrompt = `You are the lead historical researcher and master documentary scriptwriter for "The History Uncut", an elite, high-retention YouTube channel focusing strictly on World War 1 and World War 2.

BENCHMARK STYLE TO REPLICATE EXACTLY:
- Full-bleed cinematic pacing (similar to the viral "Ghost Army" video).
- Unhurried, deep, authoritative narration (approx 130-140 words total).
- 0-3s Impossible Hook: Immediately grabs the viewer with a paradoxical or shocking truth.
- Story Progression: Divided into exactly 10 chronological visual scenes (each exactly 5 to 6 seconds).
- Ending: No desperate call to subscribe. Instead, a chilling philosophical question or open cognitive loop that forces viewers to re-watch and debate in the comments.

STRICT REQUIREMENTS:
1. ONLY World War 1 or World War 2.
2. 100% verified historical facts, authentic unit names, locations, and methods.
3. Every scene MUST have a hyper-specific visual search query describing genuine historical action (no generic stock buzzwords).

OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema:
{
  "topic": "Concise verified title",
  "era": "world_war_1" or "world_war_2",
  "hook": "The first 3 seconds sentence",
  "voiceScript": "The full spoken narrative (125-140 words, unhurried documentary pacing)",
  "visualQueries": [
    "Specific 1080p archival search query 1",
    "Specific 1080p combat search query 2",
    "Specific 1080p battlefield search query 3",
    "Specific 1080p aftermath search query 4",
    "Specific 1080p military search query 5",
    "Specific 1080p documentary search query 6",
    "Specific 1080p archival search query 7",
    "Specific 1080p dramatic search query 8"
  ],
  "title": "Viral YouTube Shorts Title with #shorts",
  "description": "Engaging SEO description with hashtags",
  "tags": ["15", "relevant", "tags"]
}`;

    const userPrompt = `Conduct deep forensic historical research on: "${topicToResearch}".
Uncover the exact psychological mechanisms, secret deceptions, and untold grit. Craft the master 60-second documentary script and scene breakdown.`;

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
    console.log(`✅ [DeepResearchEngine] Research complete: "${parsed.title}" (Visual Queries: ${parsed.visualQueries?.length || 0})`);
    return parsed;
  }
}

module.exports = { DeepResearchEngine, VIRAL_RESEARCH_BENCHMARKS };
