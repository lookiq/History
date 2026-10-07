#!/usr/bin/env python3
"""
sb-v2 motion.py — the LOCKED SciBytes motion style (Md 2026-10-07).

Stills  -> 1080x1920@30fps segments with EASED (ease-in-out, never linear)
           Ken Burns, clearly perceptible motion per 3-5s hold,
           alternating direction per shot (push-in / pull-out / pan).
Video   -> trimmed to beat duration (no Ken Burns).
Transitions: zoom-blur crossfade (0.4s) DEFAULT between shots
             (scale-punch + dissolve + cheap radial smear reads as zoom-blur);
             whip-pan ONLY when shot.energy is true;
             hard cut otherwise / on punchy lines.

Memory: fully streaming — frames are computed on demand and piped to
ffmpeg stdin. Never holds more than ~3 frames in RAM (the Voyager build
OOM'd holding all 1676 frames; never again).

Usage: python3 motion.py shots.json
  shots.json: {"shots": [{"path","kind":"image|video","dur","energy","transition"}],
               "out": "segments.mp4", "fps": 30}
  transition applies BETWEEN this shot and the next: "zoom" | "whip" | "hard".
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image

W, H, FPS = 1080, 1920, 30
ZOOM_T, WHIP_T = 0.4, 0.35  # seconds
DIRS = ['push-in', 'pull-out', 'pan-right', 'pan-left']
CANVAS = (1620, 2880)  # 1.5x headroom for subpixel Ken Burns

def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def load_cover(path):
    img = Image.open(path).convert('RGB')
    w, h = img.size
    s = max(CANVAS[0] / w, CANVAS[1] / h)
    img = img.resize((math.ceil(w * s), math.ceil(h * s)), Image.BILINEAR)
    # center-crop to canvas
    x = (img.width - CANVAS[0]) // 2
    y = (img.height - CANVAS[1]) // 2
    return np.asarray(img.crop((x, y, x + CANVAS[0], y + CANVAS[1]))).astype(np.float32)

def kb_frame(canvas, direction, p):
    """Deterministic Ken Burns frame at eased progress p (0..1). Returns uint8 HxWx3."""
    cw, ch = CANVAS
    if direction == 'push-in':
        z = 1.30 - 0.30 * p
        zw, zh = W * z, H * z
        x, y = (cw - zw) / 2, (ch - zh) / 2
    elif direction == 'pull-out':
        z = 1.00 + 0.30 * p
        zw, zh = W * z, H * z
        x, y = (cw - zw) / 2, (ch - zh) / 2
    elif direction == 'pan-right':
        z = 1.15
        zw, zh = W * z, H * z
        x = (cw - zw) * p
        y = (ch - zh) / 2
    else:  # pan-left
        z = 1.15
        zw, zh = W * z, H * z
        x = (cw - zw) * (1 - p)
        y = (ch - zh) / 2
    x0, y0 = int(round(x)), int(round(y))
    crop = canvas[y0:y0 + int(round(zh)), x0:x0 + int(round(zw))]
    frame = Image.fromarray(crop.astype(np.uint8)).resize((W, H), Image.BILINEAR)
    return np.asarray(frame)

def zoom_crop(frame, scale):
    """Scale frame about center and crop back to WxH (scale>=1)."""
    zw, zh = int(W * scale), int(H * scale)
    big = Image.fromarray(frame.astype(np.uint8)).resize((zw, zh), Image.BILINEAR)
    x, y = (zw - W) // 2, (zh - H) // 2
    return np.asarray(big.crop((x, y, x + W, y + H))).astype(np.float32)

def zoom_blur_transition(fa, fb):
    """12-frame zoom-blur crossfade. fa, fb: float32 HxWx3."""
    n = int(ZOOM_T * FPS)
    for i in range(n):
        pe = smoothstep(i / max(1, n - 1))
        a = zoom_crop(fa, 1.0 + 0.14 * pe)
        b = zoom_crop(fb, 1.14 - 0.14 * pe)
        f = a * (1 - pe) + b * pe
        # cheap radial smear: average with slightly re-scaled copies
        f = f * 0.62 + zoom_crop(f, 1.025) * 0.23 + zoom_crop(f, 0.978) * 0.15
        yield np.clip(f, 0, 255).astype(np.uint8)

def hshift(frame, dx):
    """Shift horizontally with edge clamp."""
    out = np.empty_like(frame)
    if dx >= 0:
        out[:, dx:] = frame[:, :W - dx]
        out[:, :dx] = frame[:, :1]
    else:
        out[:, :W + dx] = frame[:, -dx:]
        out[:, W + dx:] = frame[:, -1:]
    return out

def whip_transition(fa, fb, direction):
    """~10-frame whip-pan: A smears out, B smears in from alternating side."""
    n = int(WHIP_T * FPS)
    for i in range(n):
        pe = smoothstep(i / max(1, n - 1))
        # B enters from direction side, A exits opposite
        b_off = int((1 - pe) * W * direction)
        a_off = int(-pe * W * direction)
        smear = np.zeros_like(fa)
        for k in (-2, -1, 0, 1, 2):
            wgt = 0.36 if k == 0 else 0.16
            # composite A shifted + B shifted, then smear horizontally
            comp = np.zeros_like(fa)
            # B on top where it has moved in
            xa0, xa1 = max(0, a_off), min(W, W + a_off)
            xb0 = xa0 - a_off
            if xa1 > xa0:
                comp[:, xa0:xa1] = fa[:, xb0:xb0 + (xa1 - xa0)]
            yb0, yb1 = max(0, b_off), min(W, W + b_off)
            xb0b = yb0 - b_off
            if yb1 > yb0:
                comp[:, yb0:yb1] = fb[:, xb0b:xb0b + (yb1 - yb0)]
            smear += hshift(comp, k * 34 * direction).astype(np.float32) * wgt
        yield np.clip(smear, 0, 255).astype(np.uint8)

class VideoReader:
    """Sequential rawvideo frame reader for a pre-trimmed clip."""
    def __init__(self, path):
        self.proc = subprocess.Popen(
            ['ffmpeg', '-v', 'error', '-i', path,
             '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-vsync', '0', '-'],
            stdout=subprocess.PIPE)
        self.buf = W * H * 3

    def read(self):
        raw = self.proc.stdout.read(self.buf)
        if len(raw) < self.buf:
            return None
        return np.frombuffer(raw, dtype=np.uint8).reshape(H, W, 3).astype(np.float32)

    def close(self):
        try:
            self.proc.stdout.close(); self.proc.wait(timeout=5)
        except Exception:
            pass

def first_frame_of_video(path):
    out = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        capture_output=True).stdout
    if len(out) < W * H * 3:
        return None
    return np.frombuffer(out, dtype=np.uint8).reshape(H, W, 3).astype(np.float32)

def last_frame_of_video(path):
    out = subprocess.run(
        ['ffmpeg', '-v', 'error', '-sseof', '-0.04', '-i', path, '-frames:v', '1',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        capture_output=True).stdout
    if len(out) < W * H * 3:
        return None
    return np.frombuffer(out, dtype=np.uint8).reshape(H, W, 3).astype(np.float32)

def main():
    spec = json.load(open(sys.argv[1]))
    shots = spec['shots']
    out_path = spec['out']
    fps = spec.get('fps', FPS)

    ff = subprocess.Popen(
        ['ffmpeg', '-y', '-v', 'error',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps),
         '-i', '-',
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
         '-pix_fmt', 'yuv420p', '-an', out_path],
        stdin=subprocess.PIPE)

    def emit(frame_u8):
        ff.stdin.write(frame_u8.tobytes())

    whip_dir = 1
    total_frames = 0
    for idx, shot in enumerate(shots):
        dur = float(shot['dur'])
        n = max(1, int(round(dur * fps)))
        direction = DIRS[idx % len(DIRS)]
        kind = shot.get('kind', 'image')

        if kind == 'image':
            canvas = load_cover(shot['path'])
            def frame_at(t, _c=canvas, _d=direction, _n=n):
                return kb_frame(_c, _d, smoothstep(t / max(1e-6, (_n / fps))))
            first = frame_at(0).astype(np.float32)
            last = frame_at((n - 1) / fps).astype(np.float32)
            for i in range(n):
                emit(frame_at(i / fps).astype(np.uint8))
                total_frames += 1
        else:
            # pre-trim video to dur, normalized
            tmp = shot['path'] + '.trim.mp4'
            if not os.path.exists(tmp):
                subprocess.run(
                    ['ffmpeg', '-y', '-v', 'error', '-i', shot['path'],
                     '-t', f'{dur:.2f}',
                     '-vf', f'fps={fps},scale=1080:1920:force_original_aspect_ratio=increase,'
                            f'crop=1080:1920,setsar=1',
                     '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                     '-an', tmp], check=True)
            first = first_frame_of_video(tmp)
            last = last_frame_of_video(tmp)
            rd = VideoReader(tmp)
            for _ in range(n):
                f = rd.read()
                if f is None:
                    break
                emit(np.clip(f, 0, 255).astype(np.uint8))
                total_frames += 1
            rd.close()
            if first is None or last is None:
                first = last = np.zeros((H, W, 3), np.float32)

        # transition into next shot
        if idx < len(shots) - 1:
            nxt = shots[idx + 1]
            ttype = shot.get('transition', 'zoom')
            if nxt.get('energy'):
                ttype = 'whip'
            if ttype == 'hard':
                continue
            # peek next shot's first frame
            if nxt.get('kind', 'image') == 'image':
                ncanvas = load_cover(nxt['path'])
                nd = DIRS[(idx + 1) % len(DIRS)]
                nfirst = kb_frame(ncanvas, nd, 0).astype(np.float32)
            else:
                ntmp = nxt['path'] + '.trim.mp4'
                if not os.path.exists(ntmp):
                    subprocess.run(
                        ['ffmpeg', '-y', '-v', 'error', '-i', nxt['path'],
                         '-t', f"{float(nxt['dur']):.2f}",
                         '-vf', f'fps={fps},scale=1080:1920:force_original_aspect_ratio=increase,'
                                f'crop=1080:1920,setsar=1',
                         '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                         '-an', ntmp], check=True)
                nfirst = first_frame_of_video(ntmp)
                if nfirst is None:
                    nfirst = np.zeros((H, W, 3), np.float32)
            if ttype == 'whip':
                gen = whip_transition(last, nfirst, whip_dir)
                whip_dir *= -1
            else:
                gen = zoom_blur_transition(last, nfirst)
            for f in gen:
                emit(f)
                total_frames += 1

    ff.stdin.close()
    ff.wait()
    print(f'motion: {total_frames} frames -> {out_path}')

if __name__ == '__main__':
    main()
