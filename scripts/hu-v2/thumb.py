"""Fallback thumbnail: dramatic video frame + pro hook text.

Extracts a frame (~30% in), then delegates text overlay to aithumb_text.py
so AI and fallback thumbnails share the exact same professional style
(Anton, white + yellow highlight, black stroke + shadow).
"""
import os
import subprocess
import sys

mp4, out, hook = sys.argv[1], sys.argv[2], sys.argv[3]
HU = os.path.dirname(os.path.abspath(__file__))

frame = '/tmp/th_frame.jpg'
subprocess.run(
    ['ffmpeg', '-y', '-v', 'error', '-ss', '8', '-i', mp4,
     '-frames:v', '1', frame],
    check=True,
)
subprocess.run(
    [sys.executable, os.path.join(HU, 'aithumb_text.py'), frame, out, hook],
    check=True,
)
print('thumb (frame fallback, pro style) ->', out)
