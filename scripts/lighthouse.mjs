import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';

// Use an available debugging port and Playwright's lifecycle on Windows.
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
  args: [`--remote-debugging-port=${port}`],
});
try {
  const result = await lighthouse(process.env.TEST_BASE_URL || 'http://localhost:4323/', {
    port,
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    logLevel: 'error',
  });
  if (!result) throw new Error('Lighthouse did not return a report.');
  const directory = new URL('../test-results/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('lighthouse.report.html', directory), result.report[0]);
  await writeFile(new URL('lighthouse.report.json', directory), result.report[1]);
  console.log(JSON.stringify({
    url: result.lhr.finalDisplayedUrl,
    formFactor: result.lhr.configSettings.formFactor,
    scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])),
    metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'].map(id => [id, result.lhr.audits[id].displayValue])),
    warnings: result.lhr.runWarnings,
  }, null, 2));
} finally {
  await browser.close();
}
