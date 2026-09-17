import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Run: node tests/analytics-browser.mjs
// IDs exist only in this child process. Every third-party request is intercepted.
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.ANALYTICS_TEST_PORT || 4322);
const origin = `http://127.0.0.1:${port}`;
try {
  await fetch(origin, { signal: AbortSignal.timeout(500) });
  throw new Error(`Port ${port} is already in use; choose ANALYTICS_TEST_PORT.`);
} catch (error) {
  if (String(error).includes('already in use')) throw error;
}

const server = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'dev', '--config', 'tests/analytics.config.mjs', '--host', '127.0.0.1', '--port', String(port), '--ignore-lock'], {
  cwd: root,
  env: { ...process.env, PUBLIC_CLARITY_PROJECT_ID: 'testproject123', PUBLIC_META_PIXEL_ID: '123456789012345', PUBLIC_TIKTOK_PIXEL_ID: 'reserved-but-disabled', PUBLIC_WHATSAPP_NUMBER: '' },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (data) => { serverLog += String(data); });
server.stderr.on('data', (data) => { serverLog += String(data); });

let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(serverLog);
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Vite is still starting. */ }
    await delay(300);
  }
  assert.ok(ready, `Isolated Astro server did not start.\n${serverLog}`);
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const external = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    external.push(url.href);
    if (url.hostname === 'www.clarity.ms' || url.hostname === 'connect.facebook.net') {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* SDK intentionally intercepted: zero external transmission. */' });
    }
    if (url.hostname === 'wa.me') return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp intercepted by integration test.</p>' });
    return route.abort();
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const clarityEvents = () => page.evaluate(() => (window.clarity?.q || []).filter(([command]) => command === 'event').map(([, event]) => event));
  const metaEvents = () => page.evaluate(() => (window.fbq?.queue || []).filter(([command]) => command === 'track').map(([, event]) => event));
  const waitForClarity = (name) => page.waitForFunction((eventName) => window.clarity?.q?.some(([command, event]) => command === 'event' && event === eventName), name);

  await page.goto(`${origin}/?utm_source=Instagram&utm_campaign=ia-trabajo-2026&utm_term=person%40example.com&email=private%40example.com`);
  await page.locator('[data-consent-banner]').waitFor({ state: 'visible' });
  assert.equal(external.length, 0, 'no third-party request before a choice');
  assert.equal(await page.locator('script[data-analytics-provider]').count(), 0);
  await page.locator('[data-consent-essential]').click();
  await page.reload();
  await page.waitForLoadState('networkidle');
  assert.equal(external.length, 0, 'essentials persists without SDK loads');
  assert.equal(await page.locator('[data-consent-banner]').isVisible(), false);

  await page.locator('[data-consent-settings]').click();
  await page.locator('[data-consent-accept]').click();
  await page.waitForFunction(() => window.clarity && window.fbq);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('script[data-analytics-provider]').count(), 2);
  assert.deepEqual(await page.evaluate(() => window.clarity.q[0]), ['consentv2', { ad_Storage: 'granted', analytics_Storage: 'granted' }]);
  assert.deepEqual(await metaEvents(), ['PageView']);
  assert.equal(new URL(page.url()).searchParams.get('utm_source'), 'instagram');
  assert.equal(new URL(page.url()).searchParams.has('email'), false);
  assert.equal(new URL(page.url()).searchParams.has('utm_term'), false);
  assert.equal(external.some((url) => /tiktok/i.test(url)), false);

  // A short pass through the curriculum must not count as a meaningful view.
  await page.locator('[data-analytics-section="curriculum"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1100);
  assert.equal((await clarityEvents()).includes('section_curriculum_view'), false);

  await page.locator('[data-analytics-section="curriculum"]').scrollIntoViewIfNeeded();
  await waitForClarity('section_curriculum_view');
  await page.waitForFunction(() => window.fbq?.queue?.some(([command, event]) => command === 'track' && event === 'ViewContent'), null, { timeout: 15000 });
  assert.equal((await clarityEvents()).filter((event) => event === 'section_curriculum_view').length, 1);
  assert.ok((await clarityEvents()).includes('section_curriculum_engaged_10+'));
  assert.deepEqual(await metaEvents(), ['PageView', 'ViewContent']);

  const faq = page.locator('details[data-faq-id]').first();
  await faq.locator('summary').click();
  await page.waitForTimeout(50);
  assert.equal(await faq.locator('summary').getAttribute('aria-expanded'), 'true');
  await faq.locator('summary').click();
  await faq.locator('summary').click();
  await page.waitForTimeout(50);
  assert.equal((await clarityEvents()).filter((event) => event === 'faq_open').length, 1);
  assert.deepEqual(await metaEvents(), ['PageView', 'ViewContent'], 'microinteractions are not sent to Meta');

  const placeholderCTA = page.locator('a[data-cta-location="hero"]');
  await placeholderCTA.click();
  await page.waitForLoadState('networkidle');
  assert.equal((await metaEvents()).includes('Contact'), false, 'unconfigured CTA is not a conversion');
  const metaBeforeConversion = await metaEvents();
  await placeholderCTA.evaluate((link) => {
    link.href = 'https://wa.me/15555550123?text=Test';
    link.dataset.whatsappReady = 'true';
    link.target = '_blank';
  });
  const popupPromise = context.waitForEvent('page');
  await placeholderCTA.click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await popup.close();
  await waitForClarity('whatsapp_hero_click');
  assert.deepEqual(await metaEvents(), [...metaBeforeConversion, 'Contact']);

  await page.reload();
  await page.locator('[data-analytics-section="curriculum"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  assert.equal((await clarityEvents()).includes('landing_view'), false, 'landing event is deduplicated for this session');
  assert.equal((await clarityEvents()).includes('section_curriculum_view'), false, 'section view is deduplicated after reload');
  assert.deepEqual(await metaEvents(), ['PageView'], 'PageView is per page; ViewContent is once per session');

  await page.locator('[data-consent-settings]').click();
  await page.evaluate(() => window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('test:revocation', JSON.stringify({ clarity: window.clarity?.q?.at(-1), meta: window.fbq?.queue?.at(-1) }));
  }));
  const beforeRevoke = external.length;
  await Promise.all([page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()), page.locator('[data-consent-essential]').click()]);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('script[data-analytics-provider]').count(), 0);
  assert.equal(external.length, beforeRevoke, 'revocation reload does not load another SDK');
  assert.equal(await page.evaluate(() => window.clarity || window.fbq || null), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('escs:analytics:utm:v1')), null);
  assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('test:revocation'))), {
    clarity: ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }],
    meta: ['consent', 'revoke'],
  });
  assert.deepEqual(pageErrors, [], 'no browser runtime errors');
  console.log('PASS: no-consent / essentials / accept / consentv2 / PageView / 1s section exposure / 10s ViewContent / FAQ / placeholder & real CTA / session dedup / revoke.');
  console.log(`Intercepted ${external.length} external requests; no provider or WhatsApp request left the browser.`);
  await context.close();
} finally {
  await browser?.close();
  server.kill();
  await delay(250);
}
