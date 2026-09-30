const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class BrandingOverlayGenerator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.join(__dirname, '..');
    this.logoPath = options.logoPath || path.join(this.projectRoot, 'assets', 'history_uncut_logo.png');
    this.channelName = options.channelName || 'The History Uncut';
    this.handle = options.handle || '@HistoryUncutUS';
  }

  /**
   * Generates a 1080x1920 transparent PNG with:
   * 1. Top-Left Channel Branding Pill
   * 2. Bottom CTA Banner (Subscribe Button + Caption Pill Container)
   * 
   * @param {string} outputPath - Target PNG path
   * @param {object} customConfig - Optional overrides
   */
  async generateOverlay(outputPath, customConfig = {}) {
    const width = 1080;
    const height = 1920;

    // 1. Prepare circular logo avatar
    const avatarSize = 82;
    const circleMask = Buffer.from(
      `<svg width="${avatarSize}" height="${avatarSize}"><circle cx="${avatarSize/2}" cy="${avatarSize/2}" r="${avatarSize/2}" fill="#fff" /></svg>`
    );
    
    const circularLogo = await sharp(this.logoPath)
      .resize(avatarSize, avatarSize)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    // 2. SVG Vector definition
    const svgContent = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Shadow for top-left branding pill -->
        <filter id="shadowTop" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.55" />
        </filter>

        <!-- Shadow for bottom caption pill -->
        <filter id="shadowBottom" x="-15%" y="-15%" width="130%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
        </filter>

        <!-- Soft glow for subscribe button -->
        <filter id="glowBtn" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#E26D74" flood-opacity="0.55" />
        </filter>
      </defs>

      <!-- 1. TOP-LEFT BRANDING PILL -->
      <g filter="url(#shadowTop)">
        <!-- Dark pill background -->
        <rect x="60" y="140" width="430" height="110" rx="30" ry="30" fill="#18191E" fill-opacity="0.95" stroke="#2D3039" stroke-width="2" />
        
        <!-- Outer gold border ring around avatar -->
        <circle cx="125" cy="195" r="43" fill="none" stroke="#FFA500" stroke-width="2.5" />

        <!-- Text: Channel Name -->
        <text x="185" y="186" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="25" font-weight="700" fill="#FFFFFF" letter-spacing="0.3">${this.channelName}</text>
        <!-- Text: Channel Handle -->
        <text x="185" y="218" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="21" font-weight="500" fill="#A0A5B5">${this.handle}</text>
      </g>

      <!-- 2. BOTTOM CAPTION + CTA BANNER -->
      <g filter="url(#shadowBottom)">
        <!-- Main Caption Pill Container (White Background with Golden Amber Border) -->
        <rect x="150" y="1470" width="790" height="110" rx="55" ry="55" fill="#FFFFFF" stroke="#F6D075" stroke-width="8" />

        <!-- Overlapping Circular SUBSCRIBE Button on the Left -->
        <g filter="url(#glowBtn)">
          <!-- Outer coral-red circle -->
          <circle cx="215" cy="1525" r="72" fill="#E26D74" stroke="#FFFFFF" stroke-width="4.5" />
          
          <!-- White Play Icon circle -->
          <circle cx="215" cy="1508" r="28" fill="#FFFFFF" />
          <!-- Play Triangle -->
          <polygon points="211,1496 225,1508 211,1520" fill="#E26D74" />
          
          <!-- "SUBSCRIBE" text under play icon -->
          <text x="215" y="1556" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.2">SUBSCRIBE</text>
        </g>
      </g>
    </svg>
    `;

    // Composite circular logo onto transparent canvas with SVG elements
    const svgBuffer = Buffer.from(svgContent);

    // Create transparent base canvas
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        { input: svgBuffer, top: 0, left: 0 },
        { input: circularLogo, top: 154, left: 84 }
      ])
      .png()
      .toFile(outputPath);

    return outputPath;
  }
}

module.exports = { BrandingOverlayGenerator };
