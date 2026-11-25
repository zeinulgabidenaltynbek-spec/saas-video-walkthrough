---
name: saas-video-walkthrough
description: >-
  Generate studio-grade, voice-narrated Full HD (1920x1080) and vertical (9:16)
  product walkthrough videos for SaaS platforms and web apps directly from the
  live UI using Playwright, neural TTS, dynamic spotlight/zoom overlays, and
  FFmpeg. Use when asked to create onboarding videos, platform tours, section
  explainers, or GitHub/social promo demos for a web application.
---

# SaaS Video Walkthrough Generator

Create repeatable, synchronized product walkthrough videos directly from a live
web application UI without manual video editing. Every video uses real DOM
coordinates (`getBoundingClientRect`), animated spotlight dimming, contrasting
highlight frames, curved SVG arrows, smooth dynamic zoom-in/zoom-out accents,
modal walkthroughs, and neural voiceover locked to millisecond timestamps.

## Core Principles (Non-Negotiable)

1. **Exhaustive Coverage (Never Skip Tabs or Modals):**
   Follow the strict hierarchy in [references/storyboard-standard.md](./references/storyboard-standard.md):
   - Start each section by orienting the viewer and naming ALL tabs present in that section.
   - Walk **Tab 1** top-to-bottom -> explain every key action button (create, edit, delete, export, impersonate) -> **open every modal window in Tab 1**, explain its fields, and close it.
   - Move to **Tab 2** -> repeat the exact same full loop (overview -> buttons -> modals -> close).
   - Continue until every tab in the section is covered. Never skip a tab or mention a modal without opening it on screen.
2. **Separate Auth & Role-Specific Series:**
   - Record authentication (`00_login.mp4`: login, account activation, password reset) as its own standalone video.
   - Never mix different user roles into one playlist. If the app has distinct UIs (e.g., Customer/Franchisee vs. Admin/Management), generate separate series so each role sees 100% its own screens.
3. **Dynamic Focus & Contrast:**
   - Pick a high-contrast accent color that stands out against the app's primary brand color (e.g., coral-red `#FF2E54` on purple/blue/white UIs).
   - Use smooth zoom-in (`"zoom": 1.15` to `1.25`) on compact buttons, tables, and modal forms, then smoothly zoom back out (`1.0`) for full-page context.
   - See [references/overlay-and-zoom-spec.md](./references/overlay-and-zoom-spec.md).
4. **Privacy Blur for Public Demos:**
   - When creating public GitHub / Reels / Shorts demos from a real client project, pass `privacyBlurSelectors` in the storyboard config to blur logos, brand titles, emails, or sensitive numbers.

## Workflow

### Step 1: Audit the Real UI Before Writing Scripts
Never guess tab labels, button texts, or modal titles.
1. Inspect every route, tab button (`tab-btn` / `role="tab"`), primary action button, and `<Modal>` component in the frontend codebase.
2. Check all API endpoints called by each route so you can mock clean, realistic demo data via Playwright `page.route(...)` without touching production data.
3. Present the full storyboard plan (sections, tabs, modals, and voiceover text) to the user for approval before recording.

### Step 2: Author the Storyboard JSON
Create a storyboard JSON following [examples/example_storyboard.json](./examples/example_storyboard.json). Each tutorial defines:
- `id`, `nav` (route path), `privacyBlurSelectors` (optional array of CSS selectors to blur)
- `scenes`: ordered list with `id`, `text`, `badge`, `selector`, `closestSelector` / `highlightParent`, `arrow` (`top`/`bottom`/`left`/`right`/`bottom-left`/null), `dim` (`true`/`false`), `zoom` (optional, e.g. `1.18`), and `action` (tab switch, modal open, modal close, scroll, type).

### Step 3: Generate Brisk Neural Voiceover
Run [scripts/generate_tts.py](./scripts/generate_tts.py):
```bash
python scripts/generate_tts.py --config storyboard.json --out manifest.json --voice ru-RU-SvetlanaNeural --tempo 1.16
```
- Uses `edge-tts` with automatic retry + FFmpeg `atempo` speedup (pitch-preserved, default `1.16x`) + `ffprobe` exact duration measurement.
- Supports any `edge-tts` voice (e.g. `en-US-AndrewNeural`, `ru-RU-SvetlanaNeural`, `ru-RU-DmitryNeural`).

### Step 4: Mandatory Dry-Run Pre-Flight Check
Before recording real-time video, ALWAYS run the 10-second dry-run validator:
```bash
node scripts/record_walkthrough.mjs --manifest storyboard.json --url http://127.0.0.1:5173 --dry-run
```
Confirm:
- Zero `[PAGEERROR]` entries (every mocked API endpoint returns the right shape, especially array endpoints like `/trash` or `/permissions`).
- Zero `[WARN] button not clicked` or `[WARN] selector not found` messages.
- Every modal scene reports a non-null bounding box (e.g. `rect=540x556`).

### Step 5: Record & Compose Full HD MP4s
1. Start the local dev server (or target URL) and record:
   ```bash
   node scripts/record_walkthrough.mjs --manifest manifest.json --url http://127.0.0.1:5173 --timings timings.json
   ```
2. Compose synchronized MP4s with automatic leading dead-air trimming:
   ```bash
   python scripts/compose_mp4.py --timings timings.json --out-dir output/
   ```

### Step 6: Visual Verification (Mandatory)
Extract key frames (especially modal frames and final tab frames) with `ffmpeg` and inspect them visually to confirm:
- No silent gaps or stalled clicks.
- Highlight frames and arrows align cleanly with elements and never clip off-screen.
- Subtitles do not cover critical prices or buttons (`padding-bottom: 120px` applied on main scroll container).

### Step 7: Optional Vertical 9:16 Promo for GitHub / Reels / Shorts
Convert any 16:9 walkthrough into a sleek 1080x1920 vertical showcase video on an Obsidian dark canvas with a top title hook and bottom caption band:
```bash
python scripts/make_vertical_promo.py --input output/01_home.mp4 --output output/01_home_vertical.mp4 --title "Auto SaaS Walkthrough" --subtitle "Built with Playwright + Neural TTS + FFmpeg"
```
