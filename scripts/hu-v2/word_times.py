"""Single-pass edge-tts: audio + word timings.
edge-tts 7.x streams SentenceBoundary (not word) events, so we interpolate
word-level timings inside each sentence proportional to word length.
Result: smooth word-by-word karaoke without a whisper pass."""
import asyncio, json, sys
import edge_tts

async def main():
    text = open(sys.argv[1], encoding='utf-8').read()
    voice = sys.argv[2] if len(sys.argv) > 2 else 'en-US-GuyNeural'
    out_mp3 = sys.argv[3]
    out_json = sys.argv[4]
    communicate = edge_tts.Communicate(text, voice)
    sentences, audio_parts, seen_types = [], [], set()
    async for chunk in communicate.stream():
        t = chunk.get('type', '')
        seen_types.add(t)
        if 'oundary' in t and 'offset' in chunk and chunk.get('text'):
            sentences.append({
                'text': chunk['text'],
                's': chunk['offset'] / 1e7,
                'e': (chunk['offset'] + chunk['duration']) / 1e7,
            })
        elif t == 'audio' and chunk.get('data'):
            audio_parts.append(chunk['data'])
    print(f'chunk types: {sorted(seen_types)}, sentences: {len(sentences)}', flush=True)

    # interpolate word timings within each sentence
    words = []
    for sent in sentences:
        ws = sent['text'].split()
        if not ws:
            continue
        total = sum(len(w) for w in ws) or 1
        span = max(0.05, sent['e'] - sent['s'])
        t = sent['s']
        for w in ws:
            d = span * len(w) / total
            words.append({'w': w, 's': round(t, 2), 'e': round(t + d, 2)})
            t += d
    # fallback: if no boundaries at all, spread evenly (never produce zero words)
    if not words:
        ws = text.split()
        est = len(ws) / 2.4  # ~145 wpm
        for i, w in enumerate(ws):
            words.append({'w': w, 's': round(i * est / len(ws), 2), 'e': round((i + 1) * est / len(ws), 2)})

    with open(out_mp3, 'wb') as f:
        f.write(b''.join(audio_parts))
    json.dump(words, open(out_json, 'w'))
    print(f'voice: {len(words)} words -> {out_mp3}', flush=True)

asyncio.run(main())
