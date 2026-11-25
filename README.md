# saas-video-walkthrough

An open-source **AI Agent Skill** (compatible with Antigravity, Claude Code, Cursor, Codex, and Windsurf) that turns any live web app or SaaS platform into a complete library of **Full HD (1920x1080)** and **Vertical (9:16)** narrated video tutorials - automatically, with zero manual video editing.

> **Why?** Recording SaaS onboarding videos by hand in Loom/Premiere breaks every time you ship a UI update. With this skill, your videos live as clean JSON storyboards: update a button, re-run one command, get fresh 1080p MP4s in minutes.

---

## What It Produces

- **Live Browser Capture (1920x1080, 30 fps):** Drives real Chrome/Chromium via Playwright against your local dev server with clean mocked API data (never touches production data).
- **Pixel-Perfect Highlights:** Injects a non-blocking SVG overlay that reads live `getBoundingClientRect()` coordinates to draw:
  - Spotlight dimmer veil around the active UI element
  - Pulsing high-contrast highlight frame (`#FF2E54` by default)
  - Self-drawing curved SVG arrows + pill callout badges
  - Smooth dynamic **zoom-in / zoom-out** focus accents (Screen Studio style)
  - Crisp bottom subtitles
- **Exhaustive Section + Tab + Modal Coverage:** Enforces an *Overview -> Top-to-Bottom -> Tab-by-Tab -> Every Modal* checklist so no hidden tab or modal dialog is skipped.
- **Brisk Neural Voiceover (`edge-tts` + `ffmpeg`):** Generates free neural speech in 50+ languages, applies pitch-preserved speedup (`atempo=1.16`), and locks every clip to its exact millisecond timestamp (`adelay`).
- **Auto-Trimmed Dead Air:** Automatically slices off initial page-load silence so every video starts crisply on the live UI.
- **Privacy Blur & Vertical 9:16 Promo Mode:** Blur brand logos/names/emails via CSS selectors and export 1080x1920 vertical Reels/Shorts/GitHub showcase videos with `make_vertical_promo.py`.

---

## Prerequisites

- **Node.js 18+** + `playwright-core` (uses your installed Chrome/Edge, no 200 MB browser download required)
- **Python 3.10+** + `edge-tts` (`pip install edge-tts`)
- **FFmpeg** + `ffprobe` in `PATH`

```bash
pip install edge-tts
npm install playwright-core
npx playwright-core install ffmpeg
```

---

## Install as an Agent Skill

### Antigravity (Global)
```bash
git clone https://github.com/<your-username>/saas-video-walkthrough.git ~/.gemini/config/skills/saas-video-walkthrough
```

### Project-Local (Antigravity / Claude Code / Cursor)
```bash
git clone https://github.com/<your-username>/saas-video-walkthrough.git .agents/skills/saas-video-walkthrough
```

Once installed, simply ask your AI coding agent:
> *"Create full video walkthroughs for every section of my SaaS app using the `saas-video-walkthrough` skill. Cover every tab and open every modal."*

---

## Quickstart (CLI Pipeline)

1. **Generate voiceover clips + timing manifest:**
   ```bash
   python scripts/generate_tts.py --config examples/example_storyboard.json --out manifest.json --voice en-US-AndrewNeural --tempo 1.15
   ```
   *(For Russian: `--voice ru-RU-SvetlanaNeural`)*

2. **Run a 10-second dry-run check (verifies all tabs, modals, and selectors):**
   ```bash
   node scripts/record_walkthrough.mjs --manifest examples/example_storyboard.json --url http://127.0.0.1:5173 --dry-run
   ```

3. **Record Full HD walkthroughs:**
   ```bash
   node scripts/record_walkthrough.mjs --manifest manifest.json --url http://127.0.0.1:5173 --timings timings.json
   ```

4. **Compose synchronized MP4s (auto-trimmed intros):**
   ```bash
   python scripts/compose_mp4.py --timings timings.json --out-dir output/
   ```

5. **Optional - Export a 9:16 vertical promo for Reels / Shorts / Telegram:**
   ```bash
   python scripts/make_vertical_promo.py --input output/01_dashboard.mp4 --output output/01_dashboard_vertical.mp4 --title "SaaS Video Walkthroughs" --subtitle "Automated with Playwright + TTS + FFmpeg"
   ```

---

## Repository Structure

```text
saas-video-walkthrough/
├── SKILL.md                          # Agent skill instructions & workflow
├── README.md                         # Public documentation
├── LICENSE                           # MIT
├── references/
│   ├── storyboard-standard.md        # Exhaustive Tab + Modal coverage rules
│   └── overlay-and-zoom-spec.md      # Spotlight, zoom, arrow & privacy blur spec
├── scripts/
│   ├── generate_tts.py               # Parallel neural TTS + tempo + ffprobe
│   ├── record_walkthrough.mjs        # Playwright 1080p recorder + SVG/zoom overlay
│   ├── compose_mp4.py                # FFmpeg audio-synced MP4 composer
│   └── make_vertical_promo.py        # 9:16 vertical split-canvas promo builder
└── examples/
    └── example_storyboard.json       # Multi-tab + modal + zoom example
```

---

## License

MIT
