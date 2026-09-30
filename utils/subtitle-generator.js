const fs = require('fs').promises;
const path = require('path');

/**
 * Generates ASS (Advanced SubStation Alpha) subtitle files
 * with millisecond-precision dynamic active-word highlighting (Karaoke style).
 */
class SubtitleGenerator {
  constructor(options = {}) {
    this.fontName = options.fontName || 'Segoe UI';
    this.fontSize = options.fontSize || 54;
    this.primaryColor = options.primaryColor || '&H00FFFFFF';    // White
    this.highlightColor = options.highlightColor || '&H0014E6FA';// Bright Gold-Yellow (&HAABBGGRR in ASS)
    this.outlineColor = options.outlineColor || '&H00000000';    // Black
    this.outlineWidth = options.outlineWidth !== undefined ? options.outlineWidth : 4;
    this.shadow = options.shadow !== undefined ? options.shadow : 2;
    this.marginL = options.marginL || 40;
    this.marginR = options.marginR || 40;
    this.marginV = options.marginV || 550;                       // Lower third
    this.maxWords = options.maxWords || 4;
  }

  /**
   * Generates a styled ASS subtitle file with word-by-word highlight.
   * @param {string} fullText - Spoken narrative script.
   * @param {number} totalDuration - Total audio duration in seconds.
   * @param {string} outputPath - Output .ass file path.
   * @param {Array<{text: string, start: number, end: number}>} wordTimings - Optional precise timings.
   */
  async generateSubtitles(fullText, totalDuration, outputPath, wordTimings = null) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Clean text
    const cleanText = fullText
      .replace(/\[([^\]|]+)\|[a-zA-Z]+\]/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Calculate word timings if not supplied
    const timings = wordTimings || this.estimateWordTimings(cleanText, totalDuration);

    // 2. Group words into short dynamic phrases (maxWords per phrase)
    const phrases = this.groupIntoPhrases(timings, this.maxWords);

    // 3. Generate ASS Dialogue events with active-word highlighting
    const events = [];
    for (const phrase of phrases) {
      for (let activeIdx = 0; activeIdx < phrase.words.length; activeIdx++) {
        const currentWord = phrase.words[activeIdx];
        const nextWord = phrase.words[activeIdx + 1];

        const eventStart = this.formatTime(currentWord.start);
        // Event ends when next word begins, or at phrase end
        const eventEnd = nextWord ? this.formatTime(nextWord.start) : this.formatTime(phrase.end);

        // Format phrase text: active word has highlight color tag
        const formattedWords = phrase.words.map((w, idx) => {
          const upper = w.word.toUpperCase();
          if (idx === activeIdx) {
            return `{\\c${this.highlightColor}}${upper}{\\c${this.primaryColor}}`;
          }
          return upper;
        }).join(' ');

        events.push(`Dialogue: 0,${eventStart},${eventEnd},DynamicSub,,0,0,0,,${formattedWords}`);
      }
    }

    // 4. Construct complete ASS document
    const assContent = `[Script Info]
Title: The History Uncut Dynamic Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DynamicSub,${this.fontName},${this.fontSize},${this.primaryColor},&H0000FFFF,${this.outlineColor},&H80000000,-1,0,0,0,100,100,1,0,1,${this.outlineWidth},${this.shadow},2,${this.marginL},${this.marginR},${this.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;

    await fs.writeFile(outputPath, assContent, 'utf8');
    return outputPath;
  }

  /**
   * Estimates word-level timing based on character weights and syllable length.
   */
  estimateWordTimings(text, totalDuration) {
    const rawWords = text.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    // Weight words by length + punctuation pause
    const weights = rawWords.map(w => {
      let weight = w.length;
      if (/[.,!?;:]$/.test(w)) weight += 4; // Extra pause for punctuation
      return Math.max(weight, 2);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const audioPaddedDuration = Math.max(totalDuration - 0.3, 1);

    const timings = [];
    let currentTime = 0.15; // Initial slight delay

    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i];
      const wordDuration = (weights[i] / totalWeight) * audioPaddedDuration;
      timings.push({
        word: word,
        start: currentTime,
        end: currentTime + wordDuration
      });
      currentTime += wordDuration;
    }

    return timings;
  }

  /**
   * Groups words into short punchy phrases of maxWords length.
   */
  groupIntoPhrases(timings, maxWords = 4) {
    const phrases = [];
    let currentWords = [];

    for (let i = 0; i < timings.length; i++) {
      const item = timings[i];
      currentWords.push(item);

      const hasPunctuation = /[.,!?;:]$/.test(item.word);
      if (currentWords.length >= maxWords || hasPunctuation || i === timings.length - 1) {
        phrases.push({
          words: currentWords,
          start: currentWords[0].start,
          end: currentWords[currentWords.length - 1].end
        });
        currentWords = [];
      }
    }

    return phrases;
  }

  /**
   * Formats seconds into ASS time format: H:MM:SS.CC (centiseconds)
   */
  formatTime(seconds) {
    const totalCenti = Math.max(0, Math.floor(seconds * 100));
    const cs = totalCenti % 100;
    const totalSecs = Math.floor(totalCenti / 100);
    const s = totalSecs % 60;
    const m = Math.floor(totalSecs / 60) % 60;
    const h = Math.floor(totalSecs / 3600);

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
}

module.exports = { SubtitleGenerator };
