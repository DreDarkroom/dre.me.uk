// Regression tests for labs/mallard/index.html. Run: cd tests && npm install && npx playwright install chromium && npm test
// Environment overrides: PLAYWRIGHT_PATH (path to a playwright package), CHROMIUM_PATH (a chromium executable), MALLARD_URL (a URL instead of the local file).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const URL_UNDER_TEST = process.env.MALLARD_URL || pathToFileURL(path.join(here, "..", "labs", "mallard", "index.html")).href;

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
});
after(async () => { await browser.close(); });

// a page with a fake clock: window.__off is added to performance.now() and to requestAnimationFrame timestamps
async function open({ startBar = 0, mode = "full" } = {}) {
  const page = await browser.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((bar) => {
    window.__startStep = bar * 16; window.__off = 0;
    const o = performance.now.bind(performance); performance.now = () => o() + window.__off;
    const r = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => r(() => cb(performance.now()));
  }, startBar);
  await page.goto(URL_UNDER_TEST);
  if (mode === "intense") {
    assert.equal(await page.isDisabled("#bint"), true, "Intense is locked until the opt-in box is ticked");
    await page.check("#ok");
  }
  await page.click(`[data-mode=${mode}]`);
  return { page, errors };
}

test("the page loads and each mode starts without errors", async () => {
  for (const mode of ["calm", "full", "intense"]) {
    const { page, errors } = await open({ mode });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => phase), 0, mode + " starts at phase 0");
    assert.deepEqual(errors, [], mode + " has no page errors");
    await page.close();
  }
});

test("the whole journey runs: phases 1 to 8, games 0 to 5, end card and the 6:66 robot", async () => {
  const { page, errors } = await open();
  const seen = new Set();
  for (let i = 0; i < 70; i++) {
    await page.evaluate(() => { window.__off += 9000; });
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => ({ ph: phase, g: game ? game.i : null, end: !!(game && game.end), h: !!horror }));
    seen.add(s.ph + ":" + s.g + ":" + s.end + ":" + s.h);
    if (s.g !== null && s.g < 6 && !s.end) await page.click("#skip").catch(() => {});
  }
  const flat = [...seen].join(" ");
  for (let p = 1; p <= 8; p++) assert.ok(flat.includes(p + ":null"), "phase " + p + " reached");
  for (let g = 0; g <= 5; g++) assert.ok(flat.includes("9:" + g + ":"), "game " + g + " reached");
  assert.ok(flat.includes(":true:false") || flat.includes(":true:true"), "end card reached");
  assert.ok(flat.includes(":true"), "robot scene appeared");
  assert.deepEqual(errors, []);
  await page.close();
});

test("audio levels per score section: no clipping, sensible peaks, not silent after the intro", async () => {
  const sections = [[0, "intro", 0.4], [12, "build", 0.9], [20, "main", 0.9], [34, "breakdown", 0.9], [45, "rebuild", 0.9]];
  for (const [bar, name, maxPeak] of sections) {
    const { page, errors } = await open({ startBar: bar });
    await page.evaluate(() => go(3));
    await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const an = ac.createAnalyser(); an.fftSize = 2048; out.connect(an);
      let peak = 0, sum = 0, n = 0, clip = 0;
      for (let i = 0; i < 50; i++) {
        await new Promise((res) => setTimeout(res, 100));
        const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
        for (const v of d) { const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; n++; if (a >= 0.999) clip++; }
      }
      return { peak, rms: Math.sqrt(sum / n), clip };
    });
    assert.equal(r.clip, 0, name + " does not clip");
    assert.ok(r.peak <= maxPeak, name + " peak " + r.peak.toFixed(3) + " should be at most " + maxPeak);
    assert.ok(r.rms > 0.01, name + " is not silent (rms " + r.rms.toFixed(3) + ")");
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test("the music event bus produces and consumes events, and section changes shift the colour", async () => {
  const { page, errors } = await open({ startBar: 15 });
  await page.evaluate(() => go(3));
  const h0 = await page.evaluate(() => hueT);
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => ({ seen: MB.seen, hueT, bar: MB.bar }));
  for (const k of ["step", "bar", "kick", "arp"]) assert.ok((r.seen[k] || 0) > 0, k + " events were released");
  assert.ok(r.hueT > h0, "colour target moved at the bar 16 section change");
  assert.deepEqual(errors, []);
  await page.close();
});

test("the recorder produces a video with audible sound", async () => {
  const { page, errors } = await open({ startBar: 20 });
  await page.evaluate(() => go(3));
  await page.waitForTimeout(500);
  await page.click("#rec");
  await page.waitForTimeout(2500);
  await page.click("#rec");
  await page.waitForSelector("#recbox:not([hidden])", { timeout: 8000 });
  const info = await page.evaluate(async () => {
    const blob = window.__lastRec; const buf = await blob.arrayBuffer();
    const c = new AudioContext(); const ab = await c.decodeAudioData(buf.slice(0)); const d = ab.getChannelData(0);
    let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    const v = document.getElementById("recvid"); await new Promise((r) => { if (v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 3000); });
    return { size: blob.size, type: blob.type, rms: Math.sqrt(s / d.length), vw: v.videoWidth, vh: v.videoHeight };
  });
  assert.ok(info.size > 50000, "file has content (" + info.size + " bytes)");
  assert.match(info.type, /^video\//);
  assert.ok(info.rms > 0.01, "recorded audio is not silent (rms " + info.rms.toFixed(3) + ")");
  assert.equal(info.vw, 412); assert.equal(info.vh, 860);
  assert.deepEqual(errors, []);
  await page.close();
});
