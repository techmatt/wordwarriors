"""edge-tts worker: one JSON request per stdin line, one JSON reply per stdout line.

Why Python, in a TypeScript repo: on 2026-10-18 Microsoft's endpoint refused the
npm `edge-tts-universal` 1.4.0 handshake with HTTP 403. Upstream Python
`edge-tts` had moved to a "v2" Sec-MS-GEC token (a modified SHA-256 plus a
CS64 digest) that the npm port never picked up. The Python package is the one
that keeps pace with the endpoint, so the build runs it through `uvx` (no venv
to manage) and talks to it over pipes. When Microsoft changes the handshake
again, the fix is bumping the pinned version in `edgeTts.ts`.

Request:  {"id": n, "text": "...", "voice": "en-US-GuyNeural", "rate": "-10%", "pitch": "+0Hz", "volume": "+0%"}
Reply:    {"id": n, "audio": "<base64 mp3>", "words": [{"word", "start", "end"}]}  or  {"id": n, "error": "..."}
"""

import asyncio
import base64
import json
import sys

import edge_tts

TICKS_PER_SECOND = 10_000_000


async def synth(req):
    kwargs = {"voice": req["voice"], "boundary": "WordBoundary"}
    for key in ("rate", "pitch", "volume"):
        if req.get(key):
            kwargs[key] = req[key]
    communicate = edge_tts.Communicate(req["text"], **kwargs)
    audio = bytearray()
    words = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / TICKS_PER_SECOND
            end = (chunk["offset"] + chunk["duration"]) / TICKS_PER_SECOND
            words.append({"word": chunk["text"], "start": round(start, 3), "end": round(end, 3)})
    if not audio:
        raise RuntimeError("no audio bytes received")
    if not words:
        raise RuntimeError("no word boundaries received")
    return {"audio": base64.b64encode(bytes(audio)).decode("ascii"), "words": words}


async def main():
    loop = asyncio.get_running_loop()
    while True:
        line = await loop.run_in_executor(None, sys.stdin.readline)
        if not line:
            return
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        try:
            reply = await synth(req)
            reply["id"] = req["id"]
        except Exception as error:  # reported back, never fatal to the worker
            reply = {"id": req["id"], "error": f"{type(error).__name__}: {error}"}
        sys.stdout.write(json.dumps(reply) + "\n")
        sys.stdout.flush()


asyncio.run(main())
