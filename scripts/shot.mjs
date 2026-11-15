// Screenshot helper: node scripts/shot.mjs <url> <out.png> [clickStart] [waitMs] [keys]
import { chromium } from '@playwright/test';
const [url, out, click = '1', wait = '2500', keys = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: true });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForSelector('#start:not([disabled])', { timeout: 30000 }).catch(() => {});
if (click === '1') await page.click('#start').catch(() => {});
for (const step of keys.split(',').filter(Boolean)) {
  const [k, ms] = step.split(':');
  await page.waitForTimeout(Number(ms || 400));
  await page.keyboard.press(k);
}
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log(logs.join('\n') || 'no console errors');
await browser.close();
