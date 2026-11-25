#!/usr/bin/env python3
"""Compose recorded WebM videos and neural TTS clips into trimmed Full HD MP4s."""

import argparse
import json
import subprocess
from pathlib import Path


def compose_one(tut_id: str, raw_video: Path, timings: list[dict], out_dir: Path, crf: int) -> Path:
    out_mp4 = out_dir / f"{tut_id}.mp4"
    first_offset = min(int(item["startOffsetMs"]) for item in timings)
    trim_ms = max(0, first_offset - 220)
    trim_sec = trim_ms / 1000.0

    cmd = ["ffmpeg", "-y", "-ss", f"{trim_sec:.3f}", "-i", str(raw_video)]
    filter_parts = []
    mix_inputs = []

    for idx, item in enumerate(timings, start=1):
        cmd.extend(["-i", item["audioFile"]])
        delay_ms = max(0, int(item["startOffsetMs"]) - trim_ms)
        label = f"a{idx}"
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[{label}]")
        mix_inputs.append(f"[{label}]")

    filter_parts.append(
        f"{''.join(mix_inputs)}amix=inputs={len(timings)}:duration=longest:dropout_transition=0:normalize=0,volume=1.15[aout]"
    )

    cmd.extend([
        "-filter_complex", ";".join(filter_parts),
        "-map", "0:v:0",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", str(crf),
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac",
        "-b:a", "160k",
        "-movflags", "+faststart",
        "-shortest",
        str(out_mp4),
    ])

    print(f"Encoding {out_mp4.name} (trimmed {trim_sec:.2f}s leading dead air)...")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"  -> {out_mp4} ({size_mb:.2f} MB)")
    return out_mp4


def main() -> None:
    parser = argparse.ArgumentParser(description="Compose synchronized MP4 walkthroughs via FFmpeg.")
    parser.add_argument("--timings", required=True, help="Path to timings JSON from record_walkthrough.mjs")
    parser.add_argument("--out-dir", default="output", help="Output directory for MP4s")
    parser.add_argument("--crf", type=int, default=21, help="x264 CRF quality (lower = sharper, default 21)")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = json.loads(Path(args.timings).read_text(encoding="utf-8"))
    for entry in entries:
        compose_one(entry["id"], Path(entry["rawVideoPath"]), entry["timings"], out_dir, args.crf)
    print("All MP4 videos composed!")


if __name__ == "__main__":
    main()
