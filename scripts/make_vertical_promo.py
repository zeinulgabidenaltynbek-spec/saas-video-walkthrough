#!/usr/bin/env python3
"""Convert a 16:9 Full HD walkthrough into a 9:16 (1080x1920) vertical Reels/Shorts/GitHub promo."""

import argparse
import subprocess
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a 9:16 vertical promo video from a 16:9 walkthrough.")
    parser.add_argument("--input", required=True, help="Input 16:9 MP4 path")
    parser.add_argument("--output", required=True, help="Output 9:16 MP4 path")
    parser.add_argument("--title", default="Auto SaaS Walkthrough", help="Top headline text")
    parser.add_argument("--subtitle", default="Playwright + Neural TTS + FFmpeg", help="Bottom caption text")
    parser.add_argument("--blur-top-left", action="store_true", help="Blur brand logo area in top-left of screen")
    parser.add_argument("--max-sec", type=int, default=0, help="Optional trim duration in seconds (0 = full)")
    args = parser.parse_args()

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Escape single quotes for ffmpeg drawtext
    t_esc = args.title.replace("'", r"\'").replace(":", r"\:")
    s_esc = args.subtitle.replace("'", r"\'").replace(":", r"\:")

    blur_chain = ""
    if args.blur_top_left:
        # Blur sidebar logo & header brand area (top-left 280x140 on 1920x1080)
        blur_chain = (
            "[0:v]split[base][logo];"
            "[logo]crop=300:130:0:0,boxblur=14:2[blurred];"
            "[base][blurred]overlay=0:0[clean];"
        )
        src_v = "[clean]"
    else:
        src_v = "[0:v]"

    # Obsidian dark 1080x1920 canvas with centered 1040px-wide framed screen capture
    filter_complex = (
        f"{blur_chain}"
        f"color=c=#09090f:s=1080x1920:r=30[bg];"
        f"{src_v}scale=1040:-2:flags=lanczos[vid];"
        f"[bg][vid]overlay=(W-w)/2:(H-h)/2-40:shortest=1,"
        f"drawtext=text='{t_esc}':fontcolor=#f4f4f6:fontsize=54:x=(w-text_w)/2:y=340,"
        f"drawtext=text='{s_esc}':fontcolor=#a1a1aa:fontsize=34:x=(w-text_w)/2:y=1410[vout]"
    )

    cmd = ["ffmpeg", "-y", "-i", args.input]
    if args.max_sec > 0:
        cmd.extend(["-t", str(args.max_sec)])
    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "160k",
        "-movflags", "+faststart",
        str(out_path),
    ])

    print(f"Rendering 9:16 vertical promo -> {out_path}...")
    subprocess.run(cmd, check=True)
    print(f"Done! ({out_path.stat().st_size / (1024 * 1024):.2f} MB)")


if __name__ == "__main__":
    main()
