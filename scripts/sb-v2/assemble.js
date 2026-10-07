/**
 * sb-v2 assemble — two-pass final assembly.
 * Pass 1: segments + drawtext watermark "SciBytes" (white@0.65, top-right)
 *         + burned ASS captions (fontsdir -> repo assets/fonts).
 * Pass 2: overlay the subscribe pill PNG for the FINAL 5 SECONDS ONLY,
 *         centered horizontally JUST BELOW the caption block
 *         (y derived from the ASS MarginV), with fade-in at stream start
 *         + enable='gte(t,totalSecs-5)'. Then mux the VO as AAC.
 * Output: 1080x1920@30fps H264.
 *
 * Pill PNG has NO alpha channel -> tight-crop to the pill bbox, then
 * colorkey=0x000000:0.12:0.12 before overlay (AGENTS.md lesson).
 * Pill fade uses st=0 (stream start) per the AGENTS.md two-pass lesson;
 * -t on pass 2 so the looped pill input doesn't encode forever.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const REPO = path.join(__dirname, '..', '..');
const FONTS_DIR = path.join(REPO, 'assets', 'fonts');

function escDrawtext(t) {
  return t.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}
function escFilterPath(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

async function pillCrop(pillPng) {
  // Tight-crop to the pill's non-black bbox at runtime (robust if the PNG changes).
  const { stdout } = await execFilePromise('python3', ['-c',
    `from PIL import Image
import numpy as np, sys
im = np.asarray(Image.open(sys.argv[1]).convert('RGB'))
mask = im.sum(axis=2) > 30
ys, xs = np.where(mask)
print(f"{xs.min()} {ys.min()} {xs.max()-xs.min()+1} {ys.max()-ys.min()+1}")`,
    pillPng]);
  const [x, y, w, h] = stdout.trim().split(' ').map(Number);
  return `crop=${w}:${h}:${x}:${y}`;
}

async function assemble({ segmentsMp4, assPath, voiceMp3, outPath, totalSecs, pillPng, marginV = 300 }) {
  const pass1 = outPath + '.pass1.mp4';
  const t = totalSecs.toFixed(2);

  // --- Pass 1: watermark + burned captions ---
  const vf1 = [
    `drawtext=fontfile='${escFilterPath(path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf'))}'` +
      `:text='${escDrawtext('SciBytes')}'` +
      `:fontsize=58:fontcolor=white@0.65:x=w-text_w-48:y=48`,
    `subtitles='${escFilterPath(assPath)}':fontsdir='${escFilterPath(FONTS_DIR)}'`,
  ].join(',');
  await execFilePromise('ffmpeg', [
    '-y', '-v', 'error', '-i', segmentsMp4,
    '-vf', vf1,
    '-t', t,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-r', '30', '-an', pass1,
  ], { maxBuffer: 64 * 1024 * 1024 });

  // --- Pass 2: pill overlay (final 5s) + VO mux ---
  // Caption block: 2 lines of 76px DejaVu Bold at bottom marginV -> block top
  // ≈ H - marginV - 2*76*1.35. Pill sits just below the block.
  const lineH = Math.round(76 * 1.35);
  const captionTop = 1920 - marginV - 2 * lineH;
  const pillY = captionTop + 2 * lineH + 24;

  const tightCrop = await pillCrop(pillPng);
  const pillIn = `[1:v]${tightCrop},scale=520:-1,` +
    `colorkey=0x000000:0.12:0.12,` +
    `fade=t=in:st=0:d=0.5:alpha=1[pill]`;
  const vf2 =
    `${pillIn};[0:v][pill]overlay=(W-w)/2:${pillY}:enable='gte(t,${(totalSecs - 5).toFixed(2)})'[v]`;
  await execFilePromise('ffmpeg', [
    '-y', '-v', 'error',
    '-i', pass1,
    '-loop', '1', '-i', pillPng,
    '-i', voiceMp3,
    '-filter_complex', vf2,
    '-map', '[v]', '-map', '2:a',
    '-af', 'apad', // video outruns the VO by the transition frames — pad, don't cut
    '-t', t, '-shortest',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-r', '30', '-c:a', 'aac', '-b:a', '160k',
    outPath,
  ], { maxBuffer: 64 * 1024 * 1024 });

  try { fs.unlinkSync(pass1); } catch (_) {}
  console.log(`   🎬 assembled: ${outPath}`);
  return outPath;
}

module.exports = { assemble };
