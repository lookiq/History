"""Build the branded bottom panel (720x510): dark gradient, gold divider+diamond, red subscribe button, handle."""
from PIL import Image, ImageDraw, ImageFont
import sys

W, H = 720, 510
out = sys.argv[1]

img = Image.new('RGB', (W, H))
px = img.load()
# vertical gradient #101014 -> #1e1e26
for y in range(H):
    t = y / H
    r = int(16 + (30 - 16) * t); g = int(16 + (30 - 16) * t); b = int(20 + (38 - 20) * t)
    for x in range(W):
        px[x, y] = (r, g, b)
d = ImageDraw.Draw(img)
GOLD = (212, 175, 55); RED = (193, 18, 31); WHITE = (255, 255, 255)

# gold divider with diamond
d.line([(60, 26), (660, 26)], fill=GOLD, width=2)
cx, cy, s = 360, 26, 9
d.polygon([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], fill=GOLD)

def font(sz, bold=True):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()

# subscribe button
bw, bh, bx, by = 470, 62, (W - 470) // 2, 330
d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=31, fill=RED)
txt = "SUBSCRIBE FOR MORE HISTORY"
f = font(27)
bb = d.textbbox((0, 0), txt, font=f)
d.text((W / 2 - (bb[2] - bb[0]) / 2, by + (bh - (bb[3] - bb[1])) / 2 - 2), txt, font=f, fill=WHITE)

# handle
h = "@HistoryUncutUS"
f2 = font(25)
bb2 = d.textbbox((0, 0), h, font=f2)
d.text((W / 2 - (bb2[2] - bb2[0]) / 2, 420), h, font=f2, fill=GOLD)

img.save(out)
print('panel ->', out)
