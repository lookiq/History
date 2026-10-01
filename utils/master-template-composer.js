const path = require('path');
const fs = require('fs');

/**
 * MASTER TEMPLATE COMPOSER FOR "THE HISTORY UNCUT"
 * Encapsulates the 4-tier vertical structure:
 *  1. Header (Y: 0..240) - Centered branding, logo, handle, gold border
 *  2. Video Window (Y: 240..1020, 1080x780) - Full width (edge-to-edge), framed by gold lines
 *  3. Caption Area (Y: 1020..1440) - Golden laurels, diamond accents, dynamic ASS subtitles
 *  4. CTA Area (Y: 1440..1580) - "SUBSCRIBE FOR MORE HISTORY" pill + YouTube play icon
 *  5. Safe Bottom (Y: 1580..1920) - Dark ancient ruins fading to black (protects YouTube UI)
 */
class MasterTemplateComposer {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '..');
    this.templatePath = path.join(this.projectRoot, 'assets', 'templates', 'master_history_uncut_template.png');
    this.videoWindow = {
      x: 0,
      y: 240,
      width: 1080,
      height: 780
    };
  }

  /**
   * Returns ASS subtitle styling configured specifically for the Master Caption Area.
   */
  getSubtitleConfig() {
    return {
      fontName: 'Georgia',
      fontSize: 54,
      primaryColor: '&H00E2EFF4',    // Ivory (#F4EFE2)
      highlightColor: '&H004CC8F5',  // Antique Gold (#F5C84C)
      outlineColor: '&H00080706',    // Deep dark charcoal
      outlineWidth: 2,
      shadow: 1,
      marginL: 220,                  // Inside left laurel wreath
      marginR: 220,                  // Inside right laurel wreath
      marginV: 690,                  // Centered vertically between laurels & diamond lines (Y≈1230)
      maxWords: 3                    // 2-3 words per phrase for impactful reading
    };
  }

  /**
   * Generates FFmpeg filter_complex commands to composite the video window,
   * template overlay, dynamic subtitles, and audio ducking.
   */
  buildFilterComplex(options) {
    const { videoDuration, relSubPath } = options;
    const { y, width, height } = this.videoWindow;

    // Stream 0: Video footage montage
    // Stream 1: Master template PNG
    // Stream 2: Voiceover audio
    // Stream 3: Background music audio
    const filter =
      `color=c=0x080706:s=1080x1920:d=${videoDuration}[bg];` +
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,` +
      `crop=${width}:${height}:(in_w-out_w)/2:(in_h-out_h)/2,setsar=1,format=yuv420p[vid];` +
      `[bg][vid]overlay=0:${y}[vbase];` +
      `[vbase][1:v]overlay=0:0[vbranded];` +
      `[vbranded]ass='${relSubPath}'[outv];` +
      `[3:a]volume=0.08,atrim=0:${videoDuration},afade=t=out:st=${videoDuration - 1.5}:d=1.5[music];` +
      `[2:a]volume=1.45,acompressor=threshold=-16dB:ratio=4:attack=5:release=50[voice];` +
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;

    return filter;
  }
}

module.exports = { MasterTemplateComposer };
