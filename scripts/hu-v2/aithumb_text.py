"""AI-thumbnail text overlay: hook words in Cinzel ExtraBold, white + thick black
stroke, centered upper-third. Falls back to DejaVu Bold if Cinzel is missing."""
import sys
from PIL import Image, ImageDraw, ImageFont

src, out, hook = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1080, 1920

img = Image.open(src).convert('RGB').resize((W, H))

# darken top 40% so the text reads on any background
overlay = Image.new('L', (1, H))
for y in range(H):
    t = max(0.0, 1.0 - y / (H * 0.42))
    overlay.putpixel((0, y), int(255 * t * 0.62))
dark = Image.new('RGB', (W, H), (0, 0, 0))
img = Image.composite(dark, img, overlay.resize((W, H)))
d = ImageDraw.Draw(img)

def font(sz):
    for p in [
        "assets/fonts/Cinzel-ExtraBold.ttf",
        "/home/hatch/workspace/history-uncut-automation/assets/fonts/Cinzel-ExtraBold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            pass
    return ImageFont.load_default()

# wrap hook into lines of <= 2 words, max 3 lines
words = hook.split()
lines, cur = [], []
for w in words:
    cur.append(w)
    if len(cur) >= 2:
        lines.append(' '.join(cur)); cur = []
if cur:
    lines.append(' '.join(cur))
lines = lines[:3]

# shrink font until the longest line fits
size = 118
while size > 60:
    f = font(size)
    widths = [d.textbbox((0, 0), ln, font=f)[2] for ln in lines]
    if max(widths, default=0) <= W - 120:
        break
    size -= 8
f = font(size)

y = 150  # upper third
for line in lines:
    bb = d.textbbox((0, 0), line, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x = (W - tw) / 2
    for ox, oy in [(-5, 5), (5, -5), (-5, -5), (5, 5), (0, 7)]:
        d.text((x + ox, y + oy), line, font=f, fill=(0, 0, 0))
    d.text((x, y), line, font=f, fill=(255, 255, 255),
           stroke_width=4, stroke_fill=(0, 0, 0))
    y += th + 22

img.save(out, quality=92)
print('aithumb text ->', out)
