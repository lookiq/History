import asyncio
import edge_tts

async def main():
    c = edge_tts.Communicate("Roman gladiators rarely fought to the death.", "en-US-ChristopherNeural")
    types = set()
    async for chunk in c.stream():
        types.add(chunk.get("type"))
        if chunk.get("type") != "audio":
            print(chunk)
    print("All chunk types seen:", types)

if __name__ == "__main__":
    asyncio.run(main())
