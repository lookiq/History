/**
 * hu-v2 voice — edge-tts with full observability + voice fallback chain.
 * Diagnosable: every attempt logs stdout/stderr/word count/audio size.
 */
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const HU = __dirname;
const WORD_TIMES = path.join(HU, 'word_times.py');

const FALLBACK_VOICES = ['en-US-DavisNeural', 'en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural'];

async function synthesize(text, preferredVoice, mp3Path, wordsPath, txtPath) {
  fs.writeFileSync(txtPath, text);
  const size0 = fs.statSync(txtPath).size;
  console.log(`   📝 Script file: ${size0} bytes`);
  if (size0 < 50) throw new Error(`Script text suspiciously short (${size0} bytes)`);

  const voices = [preferredVoice, ...FALLBACK_VOICES.filter(v => v !== preferredVoice)];
  for (const v of voices) {
    console.log(`   🎤 Trying voice: ${v}`);
    try {
      const { stdout, stderr } = await execPromise(
        `python3 "${WORD_TIMES}" "${txtPath}" "${v}" "${mp3Path}" "${wordsPath}"`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      if (stdout.trim()) console.log(`   [${v}] stdout: ${stdout.trim().slice(0, 200)}`);
      if (stderr.trim()) console.log(`   [${v}] stderr: ${stderr.trim().slice(0, 400)}`);
      const words = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
      const asize = fs.existsSync(mp3Path) ? fs.statSync(mp3Path).size : 0;
      console.log(`   [${v}] -> ${words.length} words, audio ${(asize / 1024).toFixed(0)}KB`);
      if (words.length > 10 && asize > 10000) {
        console.log(`   ✅ Voice OK: ${v}`);
        return { words, voice: v };
      }
      console.log(`   ⚠️ Voice ${v} produced too little — trying next`);
    } catch (e) {
      console.log(`   ⚠️ Voice ${v} error: ${(e.stderr || e.message || '').toString().slice(0, 400)}`);
    }
  }
  throw new Error('All TTS voices failed — see per-voice logs above');
}

module.exports = { synthesize };
