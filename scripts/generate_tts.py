#!/usr/bin/env python3
"""Generate pitch-preserved brisk neural voiceover clips for a storyboard JSON."""

import argparse
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def get_duration_ms(mp3_path: Path) -> int:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(mp3_path),
        ],
        text=True,
    ).strip()
    return int(round(float(out) * 1000))


def synth_one(tut_id: str, scene: dict, audio_root: Path, voice: str, tempo: float, force: bool) -> tuple[str, str, str, int]:
    out_dir = audio_root / tut_id
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_path = out_dir / f"{scene['id']}_raw.mp3"
    out_path = out_dir / f"{scene['id']}.mp3"

    if not force and out_path.exists() and out_path.stat().st_size > 1000:
        return tut_id, scene["id"], str(out_path.resolve()), get_duration_ms(out_path)

    clean_text = scene["text"].replace("«", "").replace("»", "").replace(" - ", ", ")
    ok = False
    for attempt in range(1, 5):
        res = subprocess.run(
            ["edge-tts", "--voice", voice, "--text", clean_text, "--write-media", str(raw_path)],
            capture_output=True,
            text=True,
        )
        if res.returncode == 0 and raw_path.exists() and raw_path.stat().st_size > 1000:
            ok = True
            break
        time.sleep(1.2 * attempt)
    if not ok:
        raise RuntimeError(f"edge-tts failed for {tut_id}/{scene['id']}: {res.stderr.strip()[:200]}")

    if abs(tempo - 1.0) > 0.01:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw_path), "-filter:a", f"atempo={tempo}", "-b:a", "128k", str(out_path)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        raw_path.unlink(missing_ok=True)
    else:
        raw_path.replace(out_path)

    return tut_id, scene["id"], str(out_path.resolve()), get_duration_ms(out_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate neural TTS clips for SaaS video walkthroughs.")
    parser.add_argument("--config", required=True, help="Path to storyboard JSON")
    parser.add_argument("--out", required=True, help="Path to write enriched manifest JSON")
    parser.add_argument("--audio-dir", default="audio", help="Directory for generated MP3 clips")
    parser.add_argument("--voice", default="en-US-AndrewNeural", help="edge-tts voice name (e.g. ru-RU-SvetlanaNeural)")
    parser.add_argument("--tempo", type=float, default=1.16, help="Pitch-preserved speed multiplier (default 1.16)")
    parser.add_argument("--workers", type=int, default=4, help="Parallel synthesis workers")
    parser.add_argument("--force", action="store_true", help="Regenerate existing clips")
    args = parser.parse_args()

    tutorials = json.loads(Path(args.config).read_text(encoding="utf-8"))
    audio_root = Path(args.audio_dir)
    jobs = [(tut["id"], sc) for tut in tutorials for sc in tut["scenes"]]

    results = {}
    print(f"Synthesizing {len(jobs)} clips with {args.voice} ({args.tempo}x)...")
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(synth_one, tid, sc, audio_root, args.voice, args.tempo, args.force) for tid, sc in jobs]
        for fut in as_completed(futs):
            tid, sid, p, dur = fut.result()
            results[(tid, sid)] = (p, dur)
            print(f"  OK {tid}/{sid}: {dur} ms")

    for tut in tutorials:
        for sc in tut["scenes"]:
            p, dur = results[(tut["id"], sc["id"])]
            sc["audioFile"] = p
            sc["durationMs"] = dur

    out_path = Path(args.out)
    out_path.write_text(json.dumps(tutorials, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest saved to {out_path}")


if __name__ == "__main__":
    main()
