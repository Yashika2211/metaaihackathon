// Records the ?video=1 demo into a submission-ready MP4 (video + the game's own synthesized audio).
// Usage: node scripts/record-video.mjs <baseUrl> <outDir>
// Needs ffmpeg on PATH. The page must be served over https (vite preview) or from GitHub Pages.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base = 'https://localhost:4173/', outDir = 'video-out'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const raw = join(outDir, 'raw');
mkdirSync(raw, { recursive: true });

const W = 1280;
const H = 720;
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({
  viewport: { width: W, height: H },
  ignoreHTTPSErrors: true,
  recordVideo: { dir: raw, size: { width: W, height: H } },
});
const page = await context.newPage();
const t0 = Date.now();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(new URL('?video=1', base).toString());
await page.waitForFunction(() => window.shadowfolk?.game, null, { timeout: 60_000 });
// A click gives the page user activation so the synthesized audio can start, then we tap the mix.
await page.mouse.click(5, 5);
await page.waitForFunction(() => window.shadowfolk.game.audio.ready, null, { timeout: 10_000 });
const captureStarted = await page.evaluate(() => window.shadowfolk.game.audio.startCapture());
const tStart = (Date.now() - t0) / 1000;
console.log('capture started', captureStarted, 'at', tStart.toFixed(2), 's');

const deadline = Date.now() + 185_000;
while (Date.now() < deadline) {
  const done = await page.evaluate(() => window.shadowfolk.game.endShownForVideo === true);
  if (done) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(4500); // hold the end card
const audioB64 = await page.evaluate(() => window.shadowfolk.game.audio.stopCapture());
const tEnd = (Date.now() - t0) / 1000;
await context.close();
await browser.close();

const webm = readdirSync(raw).find((f) => f.endsWith('.webm'));
renameSync(join(raw, webm), join(raw, 'video.webm'));
if (audioB64) writeFileSync(join(raw, 'audio.webm'), Buffer.from(audioB64, 'base64'));

const duration = Math.min(179, tEnd - tStart);
const out = join(outDir, 'Shadowfolk_demo_video.mp4');
const args = ['-y', '-ss', tStart.toFixed(2), '-i', join(raw, 'video.webm')];
if (audioB64) args.push('-i', join(raw, 'audio.webm'));
args.push('-t', duration.toFixed(2), '-map', '0:v:0');
if (audioB64) args.push('-map', '1:a:0', '-c:a', 'aac', '-b:a', '160k');
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart', out);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log('wrote', out, `(${duration.toFixed(1)} s)`, errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
