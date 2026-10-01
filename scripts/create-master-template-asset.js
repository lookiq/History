const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateMasterTemplateAsset() {
  const W = 1080;
  const H = 1920;
  const templatesDir = path.join(__dirname, '..', 'assets', 'templates');
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

  // 1. Header (1080x240)
  const headerBuf = await sharp('temp/mockup_1080x1920.png')
    .extract({ left: 0, top: 40, width: 1080, height: 240 })
    .toBuffer();

  // 2. Gold 2px line
  const goldBorder = Buffer.from(`
    <svg width="1080" height="2" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#997324" stop-opacity="0.2"/>
          <stop offset="10%" stop-color="#D6A83A" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#F5C84C" stop-opacity="1"/>
          <stop offset="90%" stop-color="#D6A83A" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#997324" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="2" fill="url(#goldGrad)"/>
    </svg>
  `);

  // 3. Clean Caption Frame (1080x420)
  const captionBuf = await sharp('temp/clean_caption_frame.png').toBuffer();

  // 4. CTA (1080x140)
  const ctaBuf = await sharp('temp/mockup_1080x1920.png')
    .extract({ left: 0, top: 1640, width: 1080, height: 140 })
    .toBuffer();

  // 5. Dark ruins bottom gradient (1080x340)
  const ruinsBottom340 = await sharp('temp/mockup_1080x1920.png')
    .extract({ left: 0, top: 1780, width: 1080, height: 140 })
    .resize(1080, 340, { fit: 'cover', position: 'bottom' })
    .toBuffer();

  // Create template with TRANSPARENT hole between y=240 and y=1020 (height=780)
  // Base is transparent
  const templatePath = path.join(templatesDir, 'master_history_uncut_template.png');

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: ruinsBottom340, top: 1580, left: 0 },
    { input: headerBuf, top: 0, left: 0 },
    { input: goldBorder, top: 239, left: 0 },
    // Between 240 and 1019 is completely transparent for the video window!
    { input: goldBorder, top: 1019, left: 0 },
    { input: captionBuf, top: 1020, left: 0 },
    { input: ctaBuf, top: 1440, left: 0 }
  ])
  .png()
  .toFile(templatePath);

  console.log(`✅ Master Template Asset created with transparent video window: ${templatePath}`);
}

generateMasterTemplateAsset().catch(console.error);
