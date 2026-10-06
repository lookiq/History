"""Single-pass edge-tts: audio + precise word boundaries (no whisper needed)."""
import asyncio, json, sys
import edge_tts

async def main():
    text = open(sys.argv[1], encoding='utf-8').read()
    voice = sys.argv[2] if len(sys.argv) > 2 else 'en-US-GuyNeural'
    out_mp3 = sys.argv[3]
    out_json = sys.argv[4]
    communicate = edge_tts.Communicate(text, voice)
    words, audio_parts, seen_types = [], [], set()
    async for chunk in communicate.stream():
        t = chunk.get('type', '')
        seen_types.add(t)
        # edge-tts uses "WordsBoundary" (plural); accept any *oundary variant
        if 'oundary' in t and 'offset' in chunk:
            words.append({
                'w': chunk['text'],
                's': round(chunk['offset'] / 1e7, 2),
                'e': round((chunk['offset'] + chunk['duration']) / 1e7, 2),
            })
        elif t == 'audio' and chunk.get('data'):
            audio_parts.append(chunk['data'])
    print(f'chunk types seen: {sorted(seen_types)}', flush=True)
    with open(out_mp3, 'wb') as f:
        f.write(b''.join(audio_parts))
    json.dump(words, open(out_json, 'w'))
    print(f'voice: {len(words)} words -> {out_mp3}')

asyncio.run(main())
