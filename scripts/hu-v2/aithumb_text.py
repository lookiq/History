"""Thumbnail hook text — professional YouTube style.

Anton (heavy condensed sans), HUGE stacked lines, white with yellow highlight
on power words (numbers / caps emphasis), thick black stroke + hard shadow,
dark gradient behind for legibility. Falls back to DejaVu Bold if missing.
"""
import sys
import re
from PIL import Image, ImageDraw, ImageFont

src, out, hook = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1080, 1920

img = Image.open(src).convert('RGB')
if img.size != (W, H):
    img = img.resize((W, H))

# darken top 45% so the text pops on any background
overlay = Image.new('L', (1, H))
for y in range(H):
    t = max(0.0, 1.0 - y / (H * 0.45))
    overlay.putpixel((0, y), int(255 * t * 0.68))
dark = Image.new('RGB', (W, H), (0, 0, 0))
img = Image.composite(dark, img, overlay.resize((W, H)))
d = ImageDraw.Draw(img)

def font(sz):
    for p in [
        "assets/fonts/Anton-Regular.ttf",
        "/home/hatch/workspace/history-uncut-automation/assets/fonts/Anton-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            pass
    return ImageFont.load_default()

WHITE = (255, 255, 255)
YELLOW = (255, 214, 10)   # highlight color for power words
BLACK = (0, 0, 0)

def word_color(w):
    # numbers and ALL-CAPS emphasis words get the yellow highlight
    if re.search(r'\d', w):
        return YELLOW
    return WHITE

# wrap hook into lines of <= 2 words, max 3 lines
words = hook.split()
lines, cur = [], []
for w in words:
    cur.append(w)
    if len(cur) >= 2:
        lines.append(cur); cur = []
if cur:
    lines.append(cur)
lines = lines[:3]

SPACE = 28
# shrink font until the longest line fits
size = 168
while size > 64:
    f = font(size)
    ok = True
    for ln in lines:
        wsum = sum(d.textbbox((0, 0), w, font=f)[2] for w in ln) + SPACE * (len(ln) - 1)
        if wsum > W - 110:
            ok = False
            break
    if ok:
        break
    size -= 8
f = font(size)

y = 170  # upper third
for ln in lines:
    widths = [d.textbbox((0, 0), w, font=f)[2] for w in ln]
    total = sum(widths) + SPACE * (len(ln) - 1)
    x = (W - total) / 2
    # line height from a representative bbox
    lh = d.textbbox((0, 0), 'Ag', font=f)[3]
    for w, ww in zip(ln, widths):
        col = word_color(w)
        # hard drop shadow (solid black, offset down-right)
        for ox, oy in [(7, 7), (7, 0), (0, 7)]:
            d.text((x + ox, y + oy), w, font=f, fill=BLACK)
        # main glyph: colored fill + thick black stroke
        d.text((x, y), w, font=f, fill=col, stroke_width=4, stroke_fill=BLACK)
        x += ww + SPACE
    y += lh + 26

img.save(out, quality=92)
print('thumb hook text ->', out)
