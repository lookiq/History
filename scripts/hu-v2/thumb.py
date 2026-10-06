"""Thumbnail: video frame + dark gradient + bold hook text (white + black stroke + shadow)."""
import subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

mp4, out, hook = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1080, 1920

# grab a dramatic frame (~30% in)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '8', '-i', mp4, '-frames:v', '1', '/tmp/th_frame.jpg'], check=True)
img = Image.open('/tmp/th_frame.jpg').convert('RGB').resize((W, H))

# darken bottom 55% for text
overlay = Image.new('L', (1, H))
for y in range(H):
    overlay.putpixel((0, y), int(255 * max(0, (y - H * 0.35) / (H * 0.65)) * 0.75))
dark = Image.new('RGB', (W, H), (0, 0, 0))
img = Image.composite(dark, img, overlay.resize((W, H)))
d = ImageDraw.Draw(img)

def font(sz):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()

# hook text: stacked, huge, centered lower third
words = hook.split()
lines, cur = [], []
for w in words:
    cur.append(w)
    if len(cur) >= 2:
        lines.append(' '.join(cur)); cur = []
if cur: lines.append(' '.join(cur))

y = H - 620
for line in lines[:3]:
    f = font(120)
    bb = d.textbbox((0, 0), line, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x = (W - tw) / 2
    # shadow + stroke
    for ox, oy in [(-4, 4), (4, -4), (-4, -4), (4, 4), (0, 6)]:
        d.text((x + ox, y + oy), line, font=f, fill=(0, 0, 0))
    d.text((x, y), line, font=f, fill=(255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0))
    y += th + 18

img.save(out, quality=92)
print('thumb ->', out)
