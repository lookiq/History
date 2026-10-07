# SciBytes Directed Pipeline (sb-v2)

Autonomous daily builder for **SciBytes** YouTube Shorts — Md-directed, GitHub-executed, **$0/month**. Mirrors the proven History Uncut directed pipeline (`scripts/hu-v2/`) but with the SciBytes manual-build look:

- **100% real NASA public-domain footage** (curated per story beat, verified IDs)
- **Eased (ease-in-out, never linear) Ken Burns** on stills, alternating direction per shot
- **Zoom-blur crossfade (0.4s)** as the default transition; **whip-pan** only on high-energy beats; **hard cuts** on punchy lines
- **Cyan/electric-blue karaoke captions** (DejaVu Sans Bold, ALL CAPS, white + black outline) — never yellow (yellow is Factify's)
- **"SciBytes" watermark** top-right, full duration
- **Subscribe pill ONLY in the final 5 seconds**, centered just below the caption block
- No baked-in music — a YouTube Audio Library track is suggested per video

## How it works

```
topics.json (12 verified topics, 3 pillars)
   → pickTopic()          pillar-rotated, never repeats until bank exhausted
   → buildScript()        hook → setup → 3 beats → payoff → question → CTA (~125-140 words)
   → edge-tts VO          SB_VOICE || en-US-ChristopherNeural, word-level timings
   → visuals.js           curated NASA IDs → images-api.nasa.gov asset manifests → downloads
   → motion.py            eased Ken Burns segments + locked transitions → segments.mp4
   → captions.js          word timings → cyan karaoke .ass
   → assemble.js          pass 1: watermark + burned captions
                          pass 2: final-5s pill overlay (tight-crop + colorkey) + VO mux
   → aithumb              AI thumbnail (hu-v2 module)
   → Telegram             video + 5-block metadata + tags + music + playlist + thumbnail
   → manifest             data/sb_v2_work/sb_batch_manifest.json
```

## Schedule

`.github/workflows/scibytes_directed.yml` — cron `45 14 * * *`
(14:45 UTC = **8:45 PM Dhaka**; ~75-min build → videos in hand **~10:00 PM Dhaka**).
Builds **2 videos** (`SB_COUNT`, default 2), then sends a batch summary with
suggested YouTube scheduling: video 1 → **tonight 1 AM Dhaka**, video 2 →
**tomorrow 1 AM Dhaka** (staggered).

Delivery uses the **dedicated SciBytes bot** via repo secrets
`SCIBYTES_TELEGRAM_BOT_TOKEN` / `SCIBYTES_TELEGRAM_CHAT_ID`
(never the History Uncut secrets — those are untouched).

## Run locally (one video)

```bash
cd ~/workspace/history-uncut-automation
node scripts/sb-v2/direct.js
```

- Needs: `ffmpeg`, `python3` with `pillow` + `numpy`, `node`, `edge-tts`
  (`pip install edge-tts pillow numpy`), DejaVu fonts (`assets/fonts/`).
- Without the `SCIBYTES_TELEGRAM_*` env vars, Telegram delivery is skipped
  cleanly — the video + thumbnail + QC frames still build into
  `data/sb_v2_work/<runId>/`.
- Set `SB_VOICE` to change the TTS voice (default `en-US-ChristopherNeural`).
- State lives in `data/sb_v2_state.json` (delete to restart the topic cycle).

## Adding topics

Append to the `topics` array in `scripts/sb-v2/topics.json`:

```json
{
  "id": "my-topic",
  "pillar": "mystery",
  "title": "The Title #shorts",
  "hook": "...", "setup": "...",
  "beats": ["...", "...", "..."],
  "payoff": "...", "question": "...",
  "focus_keyword": "...",
  "seo_keywords": ["...", "...", "...", "...", "...", "..."],
  "seo_hashtags": ["#spacefacts", "#shorts", "#scibytes"],
  "nasa_assets": [
    { "nasa_id": "PIAxxxxx", "beat": 0 },
    ...
  ],
  "sources": ["https://..."]
}
```

Rules:
- **Verify every fact by web search first** and record the source URL.
- `nasa_id` must exist: check `https://images-api.nasa.gov/asset/{nasa_id}`
  returns downloadable files. Provide **≥3 distinct visuals** per topic
  (the build fails loud below that); visuals are dealt round-robin across
  the 8 script parts, never repeating back-to-back.
- Keep scripts ~125–140 words, spoken-form numbers ("fifty-five", not "55").
- Transitions: the shots for the middle beat and the payoff get whip-pans;
  the payoff→question cut is a hard cut; everything else uses the
  zoom-blur crossfade.

## Cost

$0 — edge-tts (free), NASA Image Library (free, no key), Pollinations.ai
thumbnails (free, no key), GitHub Actions free tier. No paid APIs anywhere.
