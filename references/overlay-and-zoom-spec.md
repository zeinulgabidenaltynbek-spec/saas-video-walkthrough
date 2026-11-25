# Overlay, Dynamic Zoom & Privacy Blur Specification

## 1. Non-Blocking Overlay Guarantee
The injected overlay container AND every descendant SVG/DOM element must set:
```css
#svw-overlay, #svw-overlay * {
  pointer-events: none !important;
}
```
Never let `<svg>` or spotlight masks intercept Playwright clicks. For maximum reliability on React/Vue SPAs, trigger tab switches and modal buttons via `page.evaluate(() => btn.click())`.

## 2. Dynamic Zoom-In / Zoom-Out ("Screen Studio Effect")
When a scene sets `"zoom": 1.18` (recommended range `1.12` to `1.28`):
1. Compute the center `(cx, cy)` of the target element's `getBoundingClientRect()`.
2. Apply smooth CSS transform on the app root (`#root` or `body > div:first-child`):
   - `transform-origin: ${cx}px ${cy}px`
   - `transform: scale(${zoom})`
   - `transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)`
3. Wait 560ms for the zoom animation to settle, then re-read `getBoundingClientRect()` so the red highlight box and SVG arrow lock pixel-perfectly onto the zoomed element.
4. When the next scene has `"zoom": 1.0` (or omitted), smoothly zoom back out to `scale(1)` before measuring the next target.

## 3. Bottom Subtitle Safe Zone
Inject `main { padding-bottom: 120px !important; }` so scrolled bottom cards never hide behind the floating subtitle bar.

## 4. Privacy Blur Mode
For public demos (GitHub README, Reels, Shorts), pass `privacyBlurSelectors` (e.g. `[".sidebar-logo", ".brand-name", "input[type='email']"]`):
- Injects `filter: blur(8px) !important; user-select: none !important;` on every matching selector before recording starts.
