const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Curated ElevenLabs Voice IDs for Viral History / Documentary Shorts
 */
const ELEVENLABS_VOICES = {
  // Adam: Deep, authoritative, viral American documentary voice (used by top shorts channels)
  adam: 'pNInz6obpgDQGcFmaJgB',
  // George: Warm, British captivating storytelling voice (BBC / NatGeo style)
  george: 'JBFqnCBsd6RMkjVDRZzb',
  // Callum: Intense, edgy, dark storytelling
  callum: 'N2lVS1w4EtoT3dr4eOWO',
  // Charlie: Confident, engaging, fast-paced
  charlie: 'IKne3meq5aSn9XLyUdCD',
  // Liam: Articulate, young dramatic narrator
  liam: 'TX3LPaxmHKxFdv7VOQHJ'
};

/**
 * Curated Neural Fallback Voices via edge-tts (100% Free, Unlimited)
 */
const NEURAL_VOICES = {
  christopher: 'en-US-ChristopherNeural', // Deep, authoritative documentary
  guy: 'en-US-GuyNeural',                 // Energetic, dramatic storyteller
  brian: 'en-US-BrianNeural',             // Rich, formal narrator
  eric: 'en-US-EricNeural'                // Intense, modern documentary
};

class VoiceoverService {
  constructor(options = {}) {
    this.elevenLabsApiKey = options.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || null;
    this.defaultVoice = options.voice || 'adam';
    this.fallbackVoice = options.fallbackVoice || 'christopher';
  }

  /**
   * Generates a voiceover audio file using ElevenLabs or Microsoft Neural TTS.
   * @param {string} text - The script to narrate.
   * @param {string} outputPath - Output MP3 file path.
   * @param {object} options - Optional voice selection and parameters.
   * @returns {Promise<{outputPath: string, provider: string, duration: number}>}
   */
  async generateVoiceover(text, outputPath, options = {}) {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    // Clean text of bracket tags like [word|color] if present
    const cleanText = text
      .replace(/\[([^\]|]+)\|[a-zA-Z]+\]/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    const voiceName = (options.voice || this.defaultVoice).toLowerCase();
    const apiKey = options.apiKey || this.elevenLabsApiKey;

    if (apiKey) {
      try {
        console.log(`🎙️  Generating voiceover via ElevenLabs (${voiceName.toUpperCase()})...`);
        const result = await this.generateElevenLabs(cleanText, outputPath, voiceName, apiKey);
        return result;
      } catch (err) {
        console.warn(`⚠️  ElevenLabs generation failed: ${err.message}. Falling back to Neural TTS...`);
      }
    }

    // High-fidelity Neural TTS fallback (Edge-TTS)
    console.log(`🎙️  Generating voiceover via High-Fidelity Neural TTS (${this.fallbackVoice.toUpperCase()})...`);
    return await this.generateNeuralTTS(cleanText, outputPath, this.fallbackVoice);
  }

  /**
   * Calls ElevenLabs REST API to generate speech.
   */
  async generateElevenLabs(text, outputPath, voiceKey, apiKey) {
    const voiceId = ELEVENLABS_VOICES[voiceKey] || voiceKey || ELEVENLABS_VOICES.adam;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const payload = {
      text: text,
      model_id: 'eleven_turbo_v2_5', // ultra-fast & high quality
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.85,
        style: 0.35,
        use_speaker_boost: true
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API HTTP ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(outputPath, buffer);

    const duration = await this.getAudioDuration(outputPath);
    return {
      outputPath,
      provider: 'elevenlabs',
      voice: voiceKey,
      duration
    };
  }

  /**
   * Generates ultra-realistic speech via Microsoft Neural TTS (edge-tts).
   */
  async generateNeuralTTS(text, outputPath, voiceKey) {
    const voiceName = NEURAL_VOICES[voiceKey] || voiceKey || NEURAL_VOICES.christopher;

    // Use Python edge_tts module
    const escapedText = text.replace(/"/g, '\\"');
    const cmd = `python -m edge_tts --voice "${voiceName}" --text "${escapedText}" --write-media "${outputPath}"`;

    await execPromise(cmd);

    const duration = await this.getAudioDuration(outputPath);
    return {
      outputPath,
      provider: 'neural_tts',
      voice: voiceName,
      duration
    };
  }

  /**
   * Gets audio duration using ffprobe.
   */
  async getAudioDuration(filePath) {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      const dur = parseFloat(stdout.trim());
      return isNaN(dur) ? 0 : dur;
    } catch {
      return 0;
    }
  }
}

module.exports = { VoiceoverService, ELEVENLABS_VOICES, NEURAL_VOICES };
