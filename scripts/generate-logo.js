const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

async function createHistoryUncutLogo() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  await fs.mkdir(assetsDir, { recursive: true });
  const outputPath = path.join(assetsDir, 'history_uncut_logo.png');

  // Size: 512x512 high-resolution circular avatar
  const size = 512;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Rich dark background gradient with subtle gold rim -->
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#27272A"/>
          <stop offset="60%" stop-color="#18181B"/>
          <stop offset="100%" stop-color="#09090B"/>
        </radialGradient>
        
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FDE047"/>
          <stop offset="35%" stop-color="#EAB308"/>
          <stop offset="70%" stop-color="#CA8A04"/>
          <stop offset="100%" stop-color="#A16207"/>
        </linearGradient>

        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#DC2626" stop-opacity="0.05"/>
        </linearGradient>
      </defs>

      <!-- Circular Base -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 8}" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="10"/>

      <!-- Inner decorative ring -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 28}" fill="url(#shieldGrad)" stroke="#EAB308" stroke-width="2" stroke-dasharray="8 6" opacity="0.6"/>

      <!-- Ancient Temple / Column & Laurel Wreath Emblem -->
      <g transform="translate(${size / 2}, ${size / 2 - 20})">
        <!-- Laurel Wreath Leaves (Left) -->
        <path d="M-80,40 Q-120,-30 -70,-90 Q-50,-40 -60,40 Z" fill="url(#goldGrad)" opacity="0.85"/>
        <!-- Laurel Wreath Leaves (Right) -->
        <path d="M80,40 Q120,-30 70,-90 Q50,-40 60,40 Z" fill="url(#goldGrad)" opacity="0.85"/>

        <!-- Ancient Roman Temple Icon -->
        <!-- Pediment (Triangle Top) -->
        <polygon points="0,-100 -75,-60 75,-60" fill="url(#goldGrad)"/>
        <!-- Architrave Beam -->
        <rect x="-85" y="-55" width="170" height="14" rx="3" fill="url(#goldGrad)"/>
        <!-- 4 Classical Pillars -->
        <rect x="-75" y="-36" width="22" height="90" rx="3" fill="url(#goldGrad)"/>
        <rect x="-33" y="-36" width="22" height="90" rx="3" fill="url(#goldGrad)"/>
        <rect x="11" y="-36" width="22" height="90" rx="3" fill="url(#goldGrad)"/>
        <rect x="53" y="-36" width="22" height="90" rx="3" fill="url(#goldGrad)"/>
        <!-- Temple Steps Base -->
        <rect x="-95" y="58" width="190" height="16" rx="3" fill="url(#goldGrad)"/>
        <rect x="-105" y="76" width="210" height="14" rx="3" fill="url(#goldGrad)"/>
      </g>

      <!-- Bottom Banner Ribbon / Badge Text -->
      <g transform="translate(${size / 2}, 415)">
        <rect x="-160" y="-22" width="320" height="44" rx="22" fill="#09090B" stroke="url(#goldGrad)" stroke-width="2"/>
        <text x="0" y="3" dominant-baseline="middle" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="900" font-size="22" fill="url(#goldGrad)" letter-spacing="4px">HISTORY UNCUT</text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`Logo successfully generated at: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  createHistoryUncutLogo().catch(console.error);
}

module.exports = { createHistoryUncutLogo };
