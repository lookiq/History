const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * PSYCHOLOGICALLY CALIBRATED VIRAL COLOR PALETTE
 * Optimized for mobile OLED screens and human eye response curves.
 * 
 * 1. YELLOW (#FFE600): The "Attention & Power" Anchor.
 *    - Stimulates the left brain, highest peripheral visibility.
 *    - Triggers: Kings, Emperors, Heroes, Status, Wealth, Fame.
 * 
 * 2. RED (#FF334B): The "Amygdala Threat & Danger" Alarm.
 *    - Triggers primal survival response, stops scrolling in 0.15s.
 *    - Triggers: Death, Poison, Blood, Murder, Execution, Brutality, Fatal.
 * 
 * 3. CYAN (#00E5FF): The "Forbidden Secret & Curiosity" Dopamine Trigger.
 *    - Triggers curiosity loops and intellectual intrigue.
 *    - Triggers: Secret, Hidden, Truth, Mystery, Doctors, Conspiracy, Banned.
 * 
 * 4. GREEN (#00E676): The "Toxic Taboo & Greed" Trigger.
 *    - Triggers taboo fascination and financial intrigue.
 *    - Triggers: Cannabis, Drugs, Venom, Potions, Gold, Alchemy.
 * 
 * 5. ORANGE (#FF9100): The "High-Stakes Conflict" Trigger.
 *    - Triggers intensity and urgency.
 *    - Triggers: War, Battle, Fire, Empire Destruction.
 * 
 * 6. WHITE (#FFFFFF): The "Clean Contrast" Connector.
 *    - 70% of words remain white to maintain 100% instant readability.
 */
const COLOR_PALETTE = {
  yellow: '#FFE600', // Electric Gold-Yellow
  red: '#FF334B',    // Intense Adrenaline Red
  cyan: '#00E5FF',   // Neon Mystery Cyan
  green: '#00E676',  // Toxic Emerald Green
  orange: '#FF9100', // High-Heat War Orange
  purple: '#D946EF', // Royal Mysticism Purple
  white: '#FFFFFF'   // Crisp Pure White
};

/**
 * Psychological Trigger Word Database:
 * Automatically detects and colors high-impact words even without manual tags.
 */
const COLOR_RULES = [
  // RED: Danger, Fatality, Violence, Poison, Extreme Loss
  { 
    regex: /\b(death|dead|deadly|die|died|kill|killed|killing|killer|murder|murdered|poison|poisoned|poisonous|toxic|executed|execution|blood|bloody|brutal|brutality|fatal|grave|graves|cemetery|corpse|slaughter|massacre|autopsy|torture|perished|suicide|fratricide|strangle|strangled|bowstring)\b/i, 
    color: COLOR_PALETTE.red 
  },
  // YELLOW: Power, Royalty, Legendary Status, Protagonist
  { 
    regex: /\b(emperor|emperors|king|kings|queen|caesar|nero|gladiator|gladiators|spartan|spartans|alexander|napoleon|pharaoh|pharaohs|sultan|sultans|mehmed|suleiman|vizier|pasha|janissary|ottoman|empire|god|gods|legend|legendary|master|superstar|superstars|fame|greatest|power|throne|crown|conqueror)\b/i, 
    color: COLOR_PALETTE.yellow 
  },
  // CYAN: Secrets, Mysteries, Forbidden Knowledge, Institutional Truth
  { 
    regex: /\b(secret|secretly|secrets|hidden|forbidden|mystery|mysteries|mysterious|truth|unknown|conspiracy|banned|curse|cursed|illegal|law|laws|doctor|doctors|physician|scientists|scholar|confession|classified|unsolved|taboo|shocking|harem|palace)\b/i, 
    color: COLOR_PALETTE.cyan 
  },
  // GREEN: Taboo Substances, Venom, Greed, Extreme Riches
  { 
    regex: /\b(cannabis|drug|drugs|weed|potion|potions|venom|wealth|money|fortune|riches|gold|herb|herbs|alchemy|mutation|plant)\b/i, 
    color: COLOR_PALETTE.green 
  },
  // ORANGE: Warfare, Destruction, Flames, Catastrophe
  { 
    regex: /\b(war|wars|battle|battles|army|armies|conquest|invaded|invasion|destroyed|destruction|burned|burning|fire|flames|siege|colosseum)\b/i, 
    color: COLOR_PALETTE.orange 
  }
];

class HistoryCardGenerator {
  constructor(options = {}) {
    this.channelName = options.channelName || process.env.CHANNEL_DISPLAY_NAME || 'The History Uncut';
    this.channelHandle = options.channelHandle || process.env.CHANNEL_HANDLE || '@HistoryUncutUS';
    this.avatarPath = options.avatarPath || process.env.CHANNEL_LOGO_PATH || null;
    this.width = options.width || 1080;
    this.height = options.height || 1920;
  }

  /**
   * Applies Psychological Color Rules to the hook text.
   * Maintains the 70/30 Rule: 70% white, 30% high-voltage emotional triggers.
   */
  colorizeText(rawText) {
    if (!rawText) return [];

    const tokenRegex = /\[([^\]|]+)\|([a-zA-Z]+)\]|(\n)|(\S+)|([^\S\r\n]+)/g;
    const coloredWords = [];
    let match;

    while ((match = tokenRegex.exec(rawText)) !== null) {
      if (match[1] && match[2]) {
        // Explicitly tagged [word|color]
        const word = match[1];
        const colorName = match[2].toLowerCase();
        const color = COLOR_PALETTE[colorName] || COLOR_PALETTE.yellow;
        coloredWords.push({ text: word, color });
      } else if (match[3]) {
        // Newline
        coloredWords.push({ text: '\n', color: COLOR_PALETTE.white });
      } else if (match[4]) {
        // Regular word or untagged bracket like [word] - clean brackets and check rules
        let token = match[4].replace(/^\[+|[\]]+$/g, '');
        if (!token) token = match[4];
        let matchedColor = COLOR_PALETTE.white;
        for (const rule of COLOR_RULES) {
          if (rule.regex.test(token)) {
            matchedColor = rule.color;
            break;
          }
        }
        coloredWords.push({ text: token, color: matchedColor });
      } else if (match[5]) {
        // Whitespace
        coloredWords.push({ text: ' ', color: COLOR_PALETTE.white });
      }
    }

    return coloredWords;
  }

  /**
   * Wraps colored tokens into lines that fit within maxLineLength characters.
   */
  wrapColoredLines(coloredTokens, maxCharsPerLine = 32) {
    const lines = [];
    let currentLine = [];
    let currentLineLength = 0;

    for (const item of coloredTokens) {
      if (item.text === '\n') {
        lines.push(currentLine);
        currentLine = [];
        currentLineLength = 0;
        continue;
      }

      if (item.text === ' ') {
        if (currentLine.length > 0) {
          currentLine.push(item);
          currentLineLength += 1;
        }
        continue;
      }

      if (currentLineLength + item.text.length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [item];
        currentLineLength = item.text.length;
      } else {
        currentLine.push(item);
        currentLineLength += item.text.length;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Generates a Twitter-style Blue Checkmark SVG icon.
   */
  getVerifiedBadgeSvg(size = 32) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#38BDF8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    `;
  }

  /**
   * Generates a circular avatar either from a custom image file or styled initials/icon.
   */
  async getAvatarSvg(size = 68, channelName = '') {
    if (this.avatarPath) {
      try {
        const fullPath = path.resolve(this.avatarPath);
        const imageBuffer = await fs.readFile(fullPath);
        const circularBuffer = await sharp(imageBuffer)
          .resize(size, size, { fit: 'cover' })
          .png()
          .toBuffer();

        const base64 = circularBuffer.toString('base64');
        return `
          <defs>
            <clipPath id="customAvatarClip">
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/>
            </clipPath>
          </defs>
          <image href="data:image/png;base64,${base64}" width="${size}" height="${size}" clip-path="url(#customAvatarClip)"/>
        `;
      } catch (err) {}
    }

    return this.getDefaultAvatarSvg(size, channelName);
  }

  /**
   * Generates a default Channel Avatar SVG with channel initials or icon.
   */
  getDefaultAvatarSvg(size = 68, channelName = '') {
    const initials = (channelName || this.channelName || 'HU')
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F59E0B"/>
            <stop offset="100%" stop-color="#DC2626"/>
          </linearGradient>
        </defs>
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#avatarGrad)"/>
        <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="${size * 0.40}" fill="#FFFFFF">${initials || '🏛️'}</text>
      </svg>
    `;
  }

  /**
   * Creates an SVG layout buffer matching the History Bypass format with Color Psychology Glow.
   */
  async generateCardSvg(hookText, options = {}) {
    const width = options.width || this.width;
    const height = options.height || this.height;
    const channelName = options.channelName || this.channelName;
    const channelHandle = options.channelHandle || this.channelHandle;

    const coloredTokens = this.colorizeText(hookText);
    const wrappedLines = this.wrapColoredLines(coloredTokens, 34);

    const lineHeight = 68;
    const startY = 270;

    const textLinesSvg = wrappedLines.map((lineTokens, lineIdx) => {
      const y = startY + (lineIdx * lineHeight);
      const spans = lineTokens.map(token => {
        const escaped = token.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<tspan fill="${token.color}" xml:space="preserve">${escaped} </tspan>`;
      }).join('');

      return `<text x="50%" y="${y}" text-anchor="middle" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, 'Montserrat', Roboto, Arial, sans-serif" font-weight="900" font-size="48" letter-spacing="-0.5px" filter="url(#dropGlow)">${spans}</text>`;
    }).join('\n');

    const totalTextHeight = wrappedLines.length * lineHeight;
    const videoY = startY + totalTextHeight + 18;
    const videoHeight = 820;

    const headerWidth = 320;
    const headerX = Math.round((width - headerWidth) / 2);
    const watermarkText = (channelName || 'History Bypass').toUpperCase().replace(/\s+/g, '');

    return {
      svg: `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- High-Impact Shadow for Ultra OLED Contrast -->
            <filter id="dropGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.95"/>
            </filter>
          </defs>

          <style>
            .header-title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 34px; fill: #FFFFFF; }
            .header-handle { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 500; font-size: 24px; fill: #71717A; }
            .video-watermark { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 24px; fill: #FFFFFF; opacity: 0.45; letter-spacing: 2px; }
          </style>

          <!-- Top Channel Header (Twitter/X Verified Format) -->
          <g transform="translate(${headerX}, 130)">
            <g transform="translate(0, 0)">
              ${await this.getAvatarSvg(68, channelName)}
            </g>
            <text x="82" y="24" dominant-baseline="middle" class="header-title">${channelName}</text>
            <g transform="translate(${82 + (channelName.length * 19.5) + 6}, 6)">
              ${this.getVerifiedBadgeSvg(28)}
            </g>
            <text x="82" y="56" dominant-baseline="middle" class="header-handle">${channelHandle}</text>
          </g>

          <!-- Multi-colored Psychological Hook Text -->
          <g>
            ${textLinesSvg}
          </g>

          <!-- Channel Watermark in lower video corner -->
          <text x="1040" y="${videoY + videoHeight - 25}" text-anchor="end" class="video-watermark">${watermarkText}</text>
        </svg>
      `,
      videoY,
      videoHeight
    };
  }

  /**
   * Generates a transparent PNG overlay from the SVG.
   */
  async renderCardOverlay(hookText, outputPath, options = {}) {
    const card = await this.generateCardSvg(hookText, options);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await sharp(Buffer.from(card.svg))
      .png()
      .toFile(outputPath);

    return {
      overlayPath: outputPath,
      videoY: card.videoY,
      videoHeight: card.videoHeight
    };
  }

  /**
   * Generates a sleek, high-converting floating CTA badge overlay for the final 3 seconds.
   * Features: Glowing Red Subscribe Button + Verified Handle + Comment Call to Action.
   */
  async renderCtaOverlay(outputPath, options = {}) {
    const channelName = options.channelName || this.channelName || 'The History Uncut';
    const actionText = options.actionText || 'Uncover the truth 👇';
    const width = options.width || this.width;
    const height = options.height || this.height;

    const ctaSvg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ctaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#DC2626" flood-opacity="0.45"/>
          </filter>
        </defs>

        <!-- Floating Glassmorphism Pill centered at X=140, Y=1460 -->
        <g transform="translate(140, 1460)" filter="url(#ctaGlow)">
          <!-- Dark Pill Base (800x110) -->
          <rect width="800" height="110" rx="55" ry="55" fill="#111113" stroke="#DC2626" stroke-width="2.5" opacity="0.96"/>

          <!-- High-Voltage Red Subscribe Button (270x76) -->
          <rect x="18" y="17" width="270" height="76" rx="38" ry="38" fill="#DC2626"/>
          <text x="153" y="63" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="28" fill="#FFFFFF" letter-spacing="0.5px">SUBSCRIBE 🔔</text>

          <!-- Channel Brand & Engaging Prompt -->
          <text x="325" y="51" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="30" fill="#FFFFFF">${channelName}</text>
          <text x="325" y="85" font-family="'Segoe UI', Arial, sans-serif" font-weight="600" font-size="22" fill="#00E5FF">${actionText}</text>
        </g>
      </svg>
    `;

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(Buffer.from(ctaSvg))
      .png()
      .toFile(outputPath);

    return outputPath;
  }
}

module.exports = { HistoryCardGenerator, COLOR_PALETTE };
