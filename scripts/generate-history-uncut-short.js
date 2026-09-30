/**
 * Master Short Generator (Redirected to Full-Bleed Cinematic Pipeline)
 * 
 * REPLACES THE OLD BLACK-CARD LAYOUT WITH 100% FULL-BLEED DOCUMENTARY PIPELINE.
 * Features:
 *  1. Deep forensic WW1/WW2 historical fact-checking.
 *  2. 100% Edge-to-Edge 1080x1920 footage (zero black bars, zero black cards).
 *  3. Top-left channel branding pill (@HistoryUncutUS).
 *  4. Bottom-center subscribe CTA pill + in-pill karaoke subtitles.
 *  5. American Andrew neural voiceover with broadcast compression.
 */
const { generateFullBleedDocumentaryShort } = require('./generate-fullbleed-documentary-short');

if (require.main === module) {
  const topicArg = process.argv.slice(2).join(' ') || null;
  generateFullBleedDocumentaryShort(topicArg, { branding: true, voice: 'andrew' })
    .then(res => {
      console.log('====================================================');
      console.log('🎉 FULL-BLEED SHORT GENERATION COMPLETE:');
      console.log(`Title: ${res.title}`);
      console.log(`Duration: ${res.duration}s`);
      console.log(`File: ${res.videoPath}`);
      console.log('====================================================');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error generating short:', err);
      process.exit(1);
    });
}

module.exports = {
  generateMasterShort: generateFullBleedDocumentaryShort,
  generateFullBleedDocumentaryShort
};
