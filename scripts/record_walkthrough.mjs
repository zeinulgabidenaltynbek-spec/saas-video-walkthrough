#!/usr/bin/env node
/**
 * Universal Playwright 1920x1080 walkthrough recorder with:
 * - Spotlight dimmer + pulsing highlight box + curved SVG arrow + callout pill + subtitles
 * - Smooth dynamic zoom-in / zoom-out focus accents ("zoom": 1.18)
 * - Optional privacy blur ("privacyBlurSelectors": [".logo", ".email"])
 * - Pre-flight --dry-run mode to validate every tab, modal, and selector in seconds
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback = null) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
  };
  return {
    manifest: get("--manifest"),
    url: get("--url", "http://127.0.0.1:5173"),
    timingsOut: get("--timings", "timings.json"),
    rawDir: get("--raw-dir", "raw_video"),
    mocksModule: get("--mocks", null),
    chrome: get("--chrome", null),
    accent: get("--accent", "#FF2E54"),
    dryRun: args.includes("--dry-run"),
  };
}

function findChromeBinary(explicitPath) {
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => fs.existsSync(p)) || undefined;
}

function buildOverlayScript(accent, blurSelectors) {
  return ({ accentColor, blurList }) => {
    if (document.getElementById("svw-overlay")) return;
    const blurCss = (blurList || []).length
      ? `${blurList.join(", ")} { filter: blur(8px) !important; user-select: none !important; }`
      : "";

    const style = document.createElement("style");
    style.textContent = `
      main { padding-bottom: 120px !important; }
      ${blurCss}
      #root, body > div:first-child {
        transition: transform 0.52s cubic-bezier(0.22, 1, 0.36, 1), transform-origin 0.52s cubic-bezier(0.22, 1, 0.36, 1);
      }
      #svw-overlay, #svw-overlay * { pointer-events: none !important; }
      #svw-overlay {
        position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 2147483640;
        font-family: 'Inter', 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #svw-box {
        position: fixed; border: 3.5px solid ${accentColor}; border-radius: 16px;
        box-shadow: 0 0 0 5px ${accentColor}40, 0 0 32px ${accentColor}88;
        transition: all 0.38s cubic-bezier(0.22, 1, 0.36, 1); opacity: 0;
        animation: svwPulse 1.8s ease-in-out infinite;
      }
      @keyframes svwPulse {
        0%, 100% { box-shadow: 0 0 0 4px ${accentColor}42, 0 0 26px ${accentColor}80; }
        50% { box-shadow: 0 0 0 9px ${accentColor}22, 0 0 40px ${accentColor}b5; }
      }
      #svw-badge {
        position: fixed; background: ${accentColor}; color: #fff; font-size: 16px; font-weight: 600;
        padding: 10px 18px; border-radius: 999px;
        box-shadow: 0 10px 28px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.22);
        white-space: nowrap; opacity: 0; transform: scale(0.92); transition: all 0.3s ease;
      }
      #svw-badge.visible { opacity: 1; transform: scale(1); }
      #svw-subtitle {
        position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); max-width: 1140px;
        padding: 11px 22px; border-radius: 14px; background: rgba(11, 10, 18, 0.88);
        backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.14); color: #f4f4f6;
        font-size: 17px; line-height: 1.42; font-weight: 500; text-align: center;
        box-shadow: 0 12px 32px rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.25s ease;
      }
      #svw-subtitle.visible { opacity: 1; }
      .svw-arrow { fill: none; stroke: ${accentColor}; stroke-width: 4; stroke-linecap: round; }
    `;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "svw-overlay";
    root.innerHTML = `
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:fixed;inset:0;width:100vw;height:100vh;">
        <defs>
          <mask id="svw-mask">
            <rect x="0" y="0" width="1920" height="1080" fill="white" />
            <rect id="svw-hole" x="0" y="0" width="0" height="0" rx="16" ry="16" fill="black" />
          </mask>
          <marker id="svw-head" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
            <path d="M1,1.5 L10,6 L1,10.5 L3.2,6 Z" fill="${accentColor}" />
          </marker>
        </defs>
        <rect id="svw-dim" x="0" y="0" width="1920" height="1080" fill="rgba(8,7,16,0.54)" mask="url(#svw-mask)" style="opacity:0;transition:opacity 0.35s ease;" />
        <path id="svw-arrow" class="svw-arrow" d="" marker-end="url(#svw-head)" style="opacity:0;" />
      </svg>
      <div id="svw-box"></div>
      <div id="svw-badge"></div>
      <div id="svw-subtitle"></div>
    `;
    document.body.appendChild(root);

    window.__svw = {
      setZoom(scale, originX = 960, originY = 540) {
        const appRoot = document.getElementById("root") || document.body.firstElementChild;
        if (!appRoot || appRoot.id === "svw-overlay") return;
        if (!scale || scale <= 1.01) {
          appRoot.style.transform = "scale(1)";
        } else {
          appRoot.style.transformOrigin = `${originX}px ${originY}px`;
          appRoot.style.transform = `scale(${scale})`;
        }
      },
      setSubtitle(text) {
        const el = document.getElementById("svw-subtitle");
        el.textContent = text || "";
        el.classList.toggle("visible", Boolean(text));
      },
      clearHighlight() {
        for (const id of ["svw-box", "svw-dim", "svw-arrow"]) document.getElementById(id).style.opacity = "0";
        document.getElementById("svw-badge").classList.remove("visible");
      },
      highlightRect(rect, badgeText, arrowDir, dim) {
        const pad = 10;
        const x = Math.max(6, rect.x - pad);
        const y = Math.max(6, rect.y - pad);
        const w = Math.min(1914 - x, rect.width + pad * 2);
        const h = Math.min(970 - y, rect.height + pad * 2);
        const box = document.getElementById("svw-box");
        const hole = document.getElementById("svw-hole");
        const dimmer = document.getElementById("svw-dim");
        const badge = document.getElementById("svw-badge");
        const arrow = document.getElementById("svw-arrow");

        box.style.left = `${x}px`; box.style.top = `${y}px`;
        box.style.width = `${w}px`; box.style.height = `${Math.max(36, h)}px`;
        box.style.opacity = "1";
        hole.setAttribute("x", String(x)); hole.setAttribute("y", String(y));
        hole.setAttribute("width", String(w)); hole.setAttribute("height", String(Math.max(36, h)));
        dimmer.style.opacity = dim ? "1" : "0";

        if (badgeText) {
          badge.textContent = badgeText;
          badge.classList.remove("visible");
          badge.style.left = "0px"; badge.style.top = "0px";
          const bw = badge.offsetWidth || 260, bh = badge.offsetHeight || 42;
          let dir = arrowDir;
          if (dir === "top" && y < 110) dir = "bottom";
          if (dir === "bottom" && y + h > 840) dir = "top";
          if (dir === "right" && x + w + bw + 95 > 1900) dir = "left";
          if (dir === "left" && x - bw - 95 < 20) dir = "top";

          let bx = x + w / 2 - bw / 2, by = y - bh - 24, sx = 0, sy = 0, ex = 0, ey = 0, cx = 0, cy = 0;
          if (dir === "right") { bx = Math.min(1892 - bw, x + w + 76); by = Math.max(24, Math.min(860, y + h * 0.3 - bh / 2)); sx = bx - 10; sy = by + bh / 2; ex = x + w + 10; ey = Math.max(y + 18, Math.min(y + h - 18, sy + 6)); cx = (sx + ex) / 2; cy = sy - 16; }
          else if (dir === "left") { bx = Math.max(24, x - bw - 76); by = Math.max(24, Math.min(860, y + h * 0.3 - bh / 2)); sx = bx + bw + 10; sy = by + bh / 2; ex = x - 10; ey = Math.max(y + 18, Math.min(y + h - 18, sy + 6)); cx = (sx + ex) / 2; cy = sy - 16; }
          else if (dir === "bottom-left") { bx = Math.max(24, x - bw - 60); by = Math.min(875, y + h + 56); sx = bx + bw - 18; sy = by - 6; ex = x + w * 0.35; ey = y + h + 10; cx = sx + 22; cy = ey + 28; }
          else if (dir === "bottom") { bx = Math.max(24, Math.min(1892 - bw, x + w / 2 - bw / 2)); by = Math.min(875, y + h + 60); sx = bx + bw / 2; sy = by - 8; ex = x + w / 2; ey = y + h + 10; cx = sx - 24; cy = (sy + ey) / 2; }
          else if (dir === "top") { bx = Math.max(24, Math.min(1892 - bw, x + w / 2 - bw / 2)); by = Math.max(18, y - bh - 60); sx = bx + bw / 2; sy = by + bh + 8; ex = x + w / 2; ey = y - 10; cx = sx + 24; cy = (sy + ey) / 2; }
          else { bx = Math.max(24, Math.min(1892 - bw, x + w / 2 - bw / 2)); by = Math.max(18, y - bh - 18); }

          badge.style.left = `${bx}px`; badge.style.top = `${by}px`;
          requestAnimationFrame(() => badge.classList.add("visible"));
          if (dir) { arrow.setAttribute("d", `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`); arrow.style.opacity = "1"; }
          else arrow.style.opacity = "0";
        } else { badge.classList.remove("visible"); arrow.style.opacity = "0"; }
      },
    };
  };
}

async function jsClick(page, substr, selector = "main button") {
  const ok = await page.evaluate(({ substr, selector }) => {
    const low = substr.toLowerCase();
    const found = Array.from(document.querySelectorAll(selector)).find(
      (b) => (b.textContent || "").toLowerCase().includes(low) || (b.getAttribute("title") || "").toLowerCase().includes(low)
    );
    if (found) { found.click(); return true; }
    return false;
  }, { substr, selector });
  if (!ok) console.warn(`  [WARN] button not clicked: "${substr}" (${selector})`);
}

async function jsCloseModal(page) {
  await page.evaluate(() => {
    const close = document.querySelector(".modal-card button[aria-label='Закрыть'], [role='dialog'] button[aria-label='Close']");
    if (close) close.click();
  });
  await page.waitForTimeout(250);
}

async function runAction(page, action) {
  if (!action) return;
  await page.evaluate(() => { window.__svw?.clearHighlight(); window.__svw?.setZoom(1); });
  if (action === "scroll_bottom") { await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })); await page.waitForTimeout(500); return; }
  if (action === "scroll_top") { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await page.waitForTimeout(450); return; }
  if (action === "close_modal") { await jsCloseModal(page); return; }
  if (action.startsWith("click_tab:")) { await page.evaluate(() => window.scrollTo({ top: 0 })); await jsClick(page, action.slice(10), "button.tab-btn, [role='tab']"); await page.waitForTimeout(450); return; }
  if (action.startsWith("click_btn:")) { await jsClick(page, action.slice(10), "main button"); await page.waitForTimeout(400); return; }
  if (action.startsWith("click_primary_btn:")) { await jsClick(page, action.slice(18), "main button.btn-primary"); await page.waitForTimeout(400); return; }
  if (action.startsWith("close_modal_then_btn:")) { await jsCloseModal(page); await jsClick(page, action.slice(21), "main button"); await page.waitForTimeout(400); return; }
  if (action.startsWith("close_modal_then_tab:")) { await jsCloseModal(page); await page.evaluate(() => window.scrollTo({ top: 0 })); await jsClick(page, action.slice(21), "button.tab-btn, [role='tab']"); await page.waitForTimeout(450); return; }
  if (action.startsWith("close_modal_then_tab_and_btn:")) {
    const [tab, btn] = action.slice(29).split("|");
    await jsCloseModal(page);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await jsClick(page, tab, "button.tab-btn, [role='tab']");
    await page.waitForTimeout(450);
    await jsClick(page, btn, "main button");
    await page.waitForTimeout(400);
  }
}

async function resolveRect(page, sc) {
  if (!sc.selector) return null;
  const loc = page.locator(sc.selector).first();
  if ((await loc.count()) === 0) { console.warn(`  [WARN] selector not found: ${sc.selector}`); return null; }
  if (sc.selector !== ".modal-card") { await loc.scrollIntoViewIfNeeded({ timeout: 1800 }).catch(() => {}); await page.waitForTimeout(140); }
  if (sc.closestSelector) {
    return await loc.evaluate((el, sel) => { const r = (el.closest(sel) || el).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, sc.closestSelector);
  }
  if (sc.highlightParent) {
    return await loc.evaluate((el) => { const r = (el.parentElement || el).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  }
  return await loc.boundingBox();
}

async function main() {
  const opts = parseArgs();
  if (!opts.manifest) { console.error("Usage: node record_walkthrough.mjs --manifest <file.json> [--url ...] [--dry-run]"); process.exit(1); }

  const tutorials = JSON.parse(fs.readFileSync(opts.manifest, "utf-8"));
  let attachMocks = null;
  if (opts.mocksModule) {
    const mod = await import(pathToFileURL(path.resolve(opts.mocksModule)).href);
    attachMocks = mod.attachMocks || mod.default;
  }

  const executablePath = findChromeBinary(opts.chrome);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--window-size=1920,1080", "--autoplay-policy=no-user-gesture-required"],
  });

  const allTimings = [];
  for (const tut of tutorials) {
    console.log(`\n=== ${opts.dryRun ? "DRY-RUN" : "RECORDING"} ${tut.id} (${tut.nav}) ===`);
    const tutDir = path.join(opts.rawDir, tut.id);
    if (!opts.dryRun) { fs.mkdirSync(tutDir, { recursive: true }); for (const f of fs.readdirSync(tutDir)) fs.unlinkSync(path.join(tutDir, f)); }

    const ctxOpts = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 };
    if (!opts.dryRun) ctxOpts.recordVideo = { dir: tutDir, size: { width: 1920, height: 1080 } };

    const context = await browser.newContext(ctxOpts);
    const page = await context.newPage();
    page.on("pageerror", (e) => console.warn("  [PAGEERROR]", e.message));
    if (attachMocks) await attachMocks(page, tut);

    const t0 = Date.now();
    await page.goto(`${opts.url}${tut.nav}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.evaluate(buildOverlayScript(opts.accent, tut.privacyBlurSelectors), {
      accentColor: opts.accent,
      blurList: tut.privacyBlurSelectors || [],
    });

    const timings = [];
    for (const sc of tut.scenes) {
      console.log(`  Scene ${sc.id}`);
      await runAction(page, sc.action);

      // Reset zoom first before measuring initial target center
      await page.evaluate(() => window.__svw.setZoom(1));
      if (sc.zoom && sc.zoom > 1.01) {
        const preRect = await resolveRect(page, sc);
        if (preRect) {
          await page.evaluate(({ z, cx, cy }) => window.__svw.setZoom(z, cx, cy), {
            z: sc.zoom,
            cx: preRect.x + preRect.width / 2,
            cy: preRect.y + preRect.height / 2,
          });
          await page.waitForTimeout(opts.dryRun ? 100 : 540);
        }
      }

      if (!opts.dryRun) timings.push({ id: sc.id, audioFile: sc.audioFile, startOffsetMs: Date.now() - t0, durationMs: sc.durationMs });
      const rect = await resolveRect(page, sc);
      if (opts.dryRun) console.log(`    rect=${rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : "NULL"}`);

      await page.evaluate(({ rect, badge, arrow, dim, text }) => {
        window.__svw.setSubtitle(text);
        if (rect) window.__svw.highlightRect(rect, badge, arrow, dim);
        else window.__svw.clearHighlight();
      }, { rect, badge: sc.badge, arrow: sc.arrow, dim: sc.dim, text: sc.text });

      await page.waitForTimeout(opts.dryRun ? 140 : (sc.durationMs || 4000) + (sc.padAfterMs || 350));
    }

    if (!opts.dryRun) {
      await page.evaluate(() => { window.__svw.setZoom(1); window.__svw.setSubtitle(""); window.__svw.clearHighlight(); });
      await page.waitForTimeout(300);
      const rawVideoPath = await page.video().path();
      await context.close();
      allTimings.push({ id: tut.id, rawVideoPath, timings });
    } else {
      await context.close();
    }
  }

  await browser.close();
  if (!opts.dryRun) {
    fs.writeFileSync(opts.timingsOut, JSON.stringify(allTimings, null, 2), "utf-8");
    console.log(`Timings saved to ${opts.timingsOut}`);
  } else {
    console.log("Dry-run complete!");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
