// Offline film render: headless Chrome renders every frame with sub-frame
// accumulation and POSTs raw RGBA pixels to this process, which pipes them to
// ffmpeg (libx264, high quality). Resumable per segment.
//
// usage: node tools/render.mjs [--w 1920] [--h 1080] [--fps 60] [--spp 8]
//                              [--from 0] [--to N] [--out out/temple.mp4] [--crf 14] [--preset slow]
//
// Needs the dev server (npm run dev) and ffmpeg on PATH.
// Browser: $CHROME, else a detected Chrome / Edge / Chromium (see tools/lib/chrome.mjs).
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, gpuArgs, assertDevServer } from './lib/chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VITE_PORT = process.env.VITE_PORT || 5173;
const opt = {
  w: 1920, h: 1080, fps: 60, spp: 8, from: 0, to: 0,
  out: 'out/rainforest-film.mp4', crf: 14, preset: 'slow',
  port: 5190, cool: 30, shot: undefined, extra: '',
};
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i++) {
  const k = a[i].replace(/^--/, '');
  if (k === 'all') { opt.from = 0; opt.to = 4200; }
  else if (k in opt) opt[k] = typeof opt[k] === 'number' ? +a[++i] : a[++i];
}
if (opt.shot !== undefined) {
  const s = +opt.shot;
  opt.from = s * 420;
  opt.to = (s + 1) * 420;
  if (opt.out === 'out/rainforest-film.mp4') opt.out = `out/shot${s}.mp4`;
}
if (!opt.to) opt.to = Math.round(70 * opt.fps);

const outPath = path.resolve(ROOT, opt.out);
let CHROME;
try { CHROME = findChrome(); await assertDevServer(VITE_PORT); }
catch (e) { console.error('[render] ' + e.message); process.exit(1); }
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const ff = spawn('ffmpeg', [
  '-hide_banner', '-loglevel', 'warning', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${opt.w}x${opt.h}`, '-r', String(opt.fps), '-i', '-',
  '-vf', 'vflip,format=yuv420p',
  '-c:v', 'libx264', '-preset', opt.preset, '-crf', String(opt.crf), '-tune', 'film',
  '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  // write the BT.709 primaries/transfer into the H.264 VUI too (ffmpeg 8 drops them otherwise; pixels unchanged)
  '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
  '-movflags', '+faststart', outPath,
], { stdio: ['pipe', 'inherit', 'inherit'] });
ff.on('error', (e) => { console.error(`[render] could not start ffmpeg (${e.code || e.message}); install ffmpeg and put it on PATH`); process.exit(1); });

let expected = null, frames = 0, done = false;
let lockHeld = false, lastBeat = 0;
let t0 = Date.now();
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://127.0.0.1');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    if (url.pathname === '/frame') {
      const buf = Buffer.concat(chunks);
      const i = +url.searchParams.get('i');
      if (expected !== null && i !== expected) console.log(`[render] warning: got frame ${i}, expected ${expected}`);
      expected = i + 1;
      const ok = ff.stdin.write(buf);
      heartbeat();
      if (frames === 0) t0 = Date.now();
      frames++;
      const el = (Date.now() - t0) / 1000;
      const per = el / frames;
      const remain = (opt.to - i - 1) * per;
      const currentShot = Math.min(Math.floor(i / (opt.fps * 7)), 9);
      const shotFrame = i % (opt.fps * 7);
      if (frames % 10 === 0 || frames < 4 || (i + 1) % (opt.fps * 7) === 0) {
        console.log(`[render] frame ${i + 1}/${opt.to} (Shot ${currentShot} [${shotFrame + 1}/${opt.fps * 7}])  ${per.toFixed(2)} s/frame  ETA ${(remain / 60).toFixed(1)} min`);
      }
      if (ok) { res.writeHead(200); res.end('ok'); } else ff.stdin.once('drain', () => { res.writeHead(200); res.end('ok'); });
    } else if (url.pathname === '/done') {
      done = true; res.writeHead(200); res.end('ok');
    } else { res.writeHead(404); res.end(); }
  });
});
server.listen(opt.port, '127.0.0.1');

// share the GPU lock with tools/snap.mjs (kept fresh while frames arrive, so snap never treats it as stale)
const LOCK = path.join(ROOT, 'out', '.gpu.lock');
fs.mkdirSync(path.dirname(LOCK), { recursive: true });
for (;;) {
  try { const fd = fs.openSync(LOCK, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); lockHeld = true; break; } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
function heartbeat() {
  const now = Date.now();
  if (!lockHeld || now - lastBeat < 30000) return;
  lastBeat = now;
  try { fs.utimesSync(LOCK, now / 1000, now / 1000); } catch {}
}
const unlock = () => { if (!lockHeld) return; lockHeld = false; try { fs.unlinkSync(LOCK); } catch {} };
process.on('exit', unlock); process.on('SIGINT', () => { unlock(); process.exit(1); });
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: [...gpuArgs(), `--window-size=${opt.w},${opt.h}`, '--force-device-scale-factor=1'],
  defaultViewport: { width: opt.w, height: opt.h, deviceScaleFactor: 1 },
  protocolTimeout: 0,
  userDataDir: path.join(ROOT, 'out', '.chrome-profile'),
});
const page = await browser.newPage();
let pageGpu = 'unknown';
page.on('console', (m) => {
  const t = m.text();
  if (t.includes('[gpu]')) pageGpu = t.replace('[gpu]', '').trim();
  if (m.type() === 'error' || /\[(world|info|gpu|fatal)\]/.test(t)) console.log('[page]', t.slice(0, 500));
});
page.on('pageerror', (e) => console.log('[page:error]', e.message));
const fps = opt.fps;
const q = `mode=render&w=${opt.w}&h=${opt.h}&fps=${fps}&spp=${opt.spp}&from=${opt.from}&to=${opt.to}&port=${opt.port}&cool=${opt.cool}${opt.extra ? '&' + opt.extra : ''}`;
expected = opt.from;
console.log('[render] loading', q);
await page.goto(`http://127.0.0.1:${VITE_PORT}/?${q}`, { waitUntil: 'load', timeout: 0 });
while (!done) {
  await new Promise((r) => setTimeout(r, 1000));
  const err = await page.evaluate(() => window.__ERROR || null).catch(() => null);
  if (err) { console.log('[render] page error', err); break; }
}
await browser.close();
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
server.close();
const totalSeconds = (Date.now() - t0) / 1000;
const stat = fs.existsSync(outPath) ? fs.statSync(outPath) : null;
console.log(`[render] wrote ${opt.out}: ${frames} frames in ${(totalSeconds / 60).toFixed(1)} min (${(frames / Math.max(totalSeconds, 0.001)).toFixed(2)} fps, ${(totalSeconds / Math.max(frames, 1)).toFixed(2)} s/frame)`);

// Write detailed render telemetry report
const report = {
  timestamp: new Date().toISOString(),
  targetFile: opt.out,
  resolution: { width: opt.w, height: opt.h },
  fps: opt.fps,
  spp: opt.spp,
  framesRendered: frames,
  fromFrame: opt.from,
  toFrame: opt.to,
  durationSeconds: +(frames / opt.fps).toFixed(2),
  totalRenderTimeMinutes: +(totalSeconds / 60).toFixed(2),
  averageSecondsPerFrame: +(totalSeconds / Math.max(frames, 1)).toFixed(3),
  averageFps: +(frames / Math.max(totalSeconds, 0.001)).toFixed(2),
  fileSizeBytes: stat ? stat.size : 0,
  gpu: pageGpu,
  codec: 'libx264',
  crf: opt.crf,
  preset: opt.preset,
  colorSpace: 'bt709',
  pixelFormat: 'yuv420p',
};
const reportPath = path.resolve(ROOT, 'out', 'render-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`[render] saved report to ${path.relative(ROOT, reportPath)}`);
