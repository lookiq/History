# History Uncut v2 — "Muse Pipeline" ($0/month)

Autonomous daily Shorts. No LLM API, no ElevenLabs, no yt-dlp — nothing to expire or hit quota.

## How it works
1. **Topic** — picked from `topics.json` (30 verified topics, 3 pillars), pillar-rotated, never repeats until bank exhausted
2. **Script** — `script.js` template: hook → setup → 3 beats → payoff → question → subscribe CTA (~60s)
3. **Voiceover** — `word_times.py` via edge-tts (`en-US-GuyNeural`), free unlimited, with precise word timings
4. **Visuals** — `visuals.js`: Wikimedia Commons PD images (Ken Burns) → archive-first; bundled `assets/vault` fallback
5. **Captions** — `captions.js`: gold serif word-by-word karaoke ASS (Four Chaplains style)
6. **Assemble** — `assemble.js`: 720×1280 composite (top video / bottom branded panel), ffmpeg
7. **Thumbnail** — `thumb.py`: frame + bold hook text
8. **Upload** — reuses proven `scripts/upload-and-schedule-short.js` (YouTube API)
9. **State** — `data/hu_v2_state.json` tracks used topics/images

## Schedule
`.github/workflows/history_uncut_v2.yml` — 3×/day (12:00, 16:00, 00:00 UTC = 8AM/12PM/8PM ET).

## Cost
~12 min/run × 90 runs/month ≈ 1,080 min < 2,000 free private-repo minutes. $0.
