import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:4321';
const output = new URL('../test-results/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { baseURL, createdAt: new Date().toISOString(), checks: [], errors: [], accessibility: [], screenshots: [] };
const widths = [360, 390, 430, 768, 1024, 1280, 1440];
const trackerPattern = /clarity\.ms|(?:connect|www)\.facebook\.(?:com|net)|facebook\.com\/tr|analytics\.tiktok|googletagmanager|google-analytics|doubleclick/i;

function check(name, passed, details = {}) {
  report.checks.push({ name, passed: Boolean(passed), ...details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
}

async function revealWholePage(page) {
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    for (let position = 0; position < height; position += Math.max(300, innerHeight * 0.75)) {
      window.scrollTo({ top: position, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 55));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(900);
}

async function waitReady(page, path) {
  await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('main').waitFor();
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
    page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
    page.on('request', (request) => { if (trackerPattern.test(request.url())) requests.push(request.url()); });
    page.on('response', (response) => { if (response.status() >= 400) errors.push({ type: 'http', status: response.status(), url: response.url() }); });

    for (const [route, name] of [['/', 'home'], ['/privacidad/', 'privacy']]) {
      await waitReady(page, route);
      await revealWholePage(page);
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          elements: [...document.querySelectorAll('body *')].filter((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.width && (bounds.right > innerWidth + 1 || bounds.left < -1) && getComputedStyle(element).position !== 'fixed';
          }).slice(0, 12).map((element) => ({ tag: element.tagName, class: element.getAttribute('class'), width: element.getBoundingClientRect().width })),
        };
      });
      check(`${name} / ${width}px / no horizontal overflow`, overflow.scrollWidth <= overflow.clientWidth + 1, overflow);

      const inactiveTracking = await page.evaluate(() => ({
        scriptSources: [...document.scripts].map((script) => script.src).filter((src) => /clarity|facebook|tiktok/i.test(src)),
        globals: { fbq: typeof window.fbq, clarity: typeof window.clarity, ttq: typeof window.ttq },
        localStorageKeys: Object.keys(localStorage),
        sessionStorageKeys: Object.keys(sessionStorage),
        bannerHidden: document.querySelector('[data-consent-banner]')?.hasAttribute('hidden'),
      }));
      check(`${name} / ${width}px / no configured providers remain inactive`,
        inactiveTracking.scriptSources.length === 0 && Object.values(inactiveTracking.globals).every((value) => value === 'undefined') && requests.length === 0,
        inactiveTracking);
      check(`${name} / ${width}px / no unsolicited analytics storage`, inactiveTracking.localStorageKeys.length === 0 && inactiveTracking.sessionStorageKeys.length === 0);

      const ctas = await page.locator('[data-cta-location]').evaluateAll((links) => links.map((link) => ({ href: link.getAttribute('href'), ready: link.getAttribute('data-whatsapp-ready'), target: link.getAttribute('target') })));
      check(`${name} / ${width}px / placeholder CTAs do not open WhatsApp`, ctas.length > 0 && ctas.every((cta) => !/wa\.me|whatsapp\.com/.test(cta.href || '') && cta.ready === 'false'), { ctas });

      if (route === '/' && width < 900) {
        const toggle = page.locator('.menu-toggle');
        await toggle.focus();
        await page.keyboard.press('Enter');
        check(`home / ${width}px / mobile menu opens with keyboard`, await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('#mobile-nav').isVisible());
        await page.keyboard.press('Tab');
        check(`home / ${width}px / mobile menu links keyboard reachable`, await page.evaluate(() => Boolean(document.activeElement?.closest('#mobile-nav'))));
        await page.keyboard.press('Escape');
        check(`home / ${width}px / Escape closes mobile menu and returns focus`, await toggle.getAttribute('aria-expanded') === 'false' && await page.locator('#mobile-nav').isHidden() && await toggle.evaluate((element) => document.activeElement === element));
      }

      if (route === '/' && [390, 1440].includes(width)) {
        const summaries = page.locator('[data-accordion] > summary');
        for (let index = 0; index < await summaries.count(); index++) {
          const summary = summaries.nth(index);
          await summary.focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(60);
          check(`home / ${width}px / FAQ ${index + 1} opens with Enter`, await summary.getAttribute('aria-expanded') === 'true' && await summary.evaluate((element) => element.parentElement.open));
          await page.keyboard.press('Space');
          await page.waitForTimeout(60);
          check(`home / ${width}px / FAQ ${index + 1} closes with Space`, await summary.getAttribute('aria-expanded') === 'false' && await summary.evaluate((element) => !element.parentElement.open));
        }
      }

      if ([390, 1440].includes(width)) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(150);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const violations = results.violations.map(({ id, impact, description, help, helpUrl, nodes }) => ({ id, impact, description, help, helpUrl, nodes: nodes.map(({ html, target, failureSummary }) => ({ html, target, failureSummary })) }));
        report.accessibility.push({ page: name, width, violations, incomplete: results.incomplete.length, passes: results.passes.length });
        check(`${name} / ${width}px / axe WCAG A and AA`, violations.length === 0, { violations: violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length })) });
        const screenshot = `${name}-${width}.png`;
        await page.screenshot({ path: new URL(screenshot, output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true, animations: 'disabled' });
        report.screenshots.push(screenshot);
      }
    }
    check(`${width}px / console and network errors`, errors.length === 0, { errors });
    report.errors.push(...errors.map((error) => ({ width, ...error })));
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await waitReady(page, '/');
  const reduced = await page.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    reveals: [...document.querySelectorAll('[data-reveal]')].map((element) => ({ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform })),
  }));
  check('Reduced motion / scroll behavior is auto', reduced.scrollBehavior === 'auto', { actual: reduced.scrollBehavior });
  check('Reduced motion / all reveal content visible without scrolling', reduced.reveals.length > 0 && reduced.reveals.every((item) => item.opacity === '1' && item.transform === 'none'), { reveals: reduced.reveals.length });

  await page.getByRole('link', { name: 'Privacidad', exact: true }).click();
  await page.waitForURL(/\/privacidad\/?$/);
  check('Privacy navigation / footer opens privacy page', await page.locator('h1').innerText().then((text) => /Tu privacidad/i.test(text)));
  check('Privacy navigation / draft has noindex', await page.locator('meta[name="robots"]').getAttribute('content').then((value) => value.includes('noindex')));
  await page.locator('.menu-toggle').click();
  await page.locator('#mobile-nav').getByRole('link', { name: /Contenido/ }).click();
  await page.waitForURL(/\/#contenido$/);
  check('Privacy navigation / menu returns to course section', await page.locator('#contenido').count() === 1);
  await context.close();
} catch (error) {
  report.errors.push({ type: 'test-runner', message: error.message, stack: error.stack });
  check('Test runner completed', false, { error: error.message });
} finally {
  await browser.close();
  report.summary = {
    total: report.checks.length,
    passed: report.checks.filter((item) => item.passed).length,
    failed: report.checks.filter((item) => !item.passed).length,
    axeViolations: report.accessibility.reduce((total, item) => total + item.violations.length, 0),
    errors: report.errors.length,
  };
  await writeFile(new URL('e2e-report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.failed || report.summary.errors) process.exitCode = 1;
}
