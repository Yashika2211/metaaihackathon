import { expect, test, type Page } from '@playwright/test';

type Probe = { inXR: boolean; phase: string; mode: string; hands: boolean; paused: boolean };

const probe = (page: Page) =>
  page.evaluate((): Probe => {
    const sf = (window as unknown as { shadowfolk?: { game: any } }).shadowfolk;
    const g = sf?.game;
    if (!g) return { inXR: false, phase: 'loading', mode: '', hands: false, paused: false };
    return {
      inXR: !!g.world.session,
      phase: g.engine.phase,
      mode: g.mode,
      hands: !!(g.hands.left || g.hands.right),
      paused: g.paused,
    };
  });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('loads, enters the emulated XR session and starts onboarding without errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?debug=1');
  const start = page.locator('#start');
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();
  await expect.poll(async () => (await probe(page)).inXR, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await probe(page)).phase, { timeout: 20_000 }).toBe('onboarding');
  expect((await probe(page)).hands).toBe(true);
  expect(errors).toEqual([]);
});

test('demo mode plays from onboarding into the story', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?demo=1');
  await expect.poll(async () => (await probe(page)).phase, { timeout: 60_000 }).toBe('story');
  expect(errors).toEqual([]);
});

test('pause and resume from the keyboard', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 60_000 });
  await page.locator('#start').click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('p');
  await expect.poll(async () => (await probe(page)).paused).toBe(true);
  await page.keyboard.press('p');
  await expect.poll(async () => (await probe(page)).paused).toBe(false);
});

test('makes no third-party network requests (everything is generated in code)', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u);
  });
  await page.goto('/?demo=1');
  await expect.poll(async () => (await probe(page)).phase, { timeout: 60_000 }).toBe('story');
  expect(foreign).toEqual([]);
});
