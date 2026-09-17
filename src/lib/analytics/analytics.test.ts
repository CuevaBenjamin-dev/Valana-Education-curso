import assert from 'node:assert/strict';
import test from 'node:test';
import { createClarity } from './clarity.ts';
import { parseConsent } from './consent.ts';
import { accumulatedVisibleTime, isMeaningfulExposure, nextEngagementDelay, requiredVisibleArea } from './exposure.ts';
import { createMeta } from './meta.ts';
import { claimEvent, createEventLedger } from './storage.ts';
import { tiktok } from './tiktok.ts';
import { campaignChannel, sanitizeCampaign, sanitizeCampaignValue, sanitizeTrackingUrl } from './utm.ts';

test('consent is explicit, versioned and expires; corrupt storage cannot grant it', () => {
  const now = 2_000_000_000_000;
  assert.equal(parseConsent(null, now), null);
  assert.equal(parseConsent({ version: 1, choice: 'yes', at: now }, now), null);
  assert.equal(parseConsent({ version: 0, choice: 'all', at: now }, now), null);
  assert.equal(parseConsent({ version: 1, choice: 'all', at: now + 1 }, now), null);
  assert.equal(parseConsent({ version: 1, choice: 'all', at: now - 181 * 86400000 }, now), null);
  assert.deepEqual(parseConsent({ version: 1, choice: 'essential', at: now }, now), { choice: 'essential', at: now });
});

test('UTM context permits campaign slugs and rejects common personal or arbitrary values', () => {
  assert.equal(sanitizeCampaignValue('  IA-TRABAJO_2026 '), 'ia-trabajo_2026');
  for (const value of ['person@example.com', '51999888777', 'phone_51999888777', 'phone_123', 'nombre_benjamin', 'https://example.com', 'Ana Pérez', '<script>', 'x'.repeat(65)]) {
    assert.equal(sanitizeCampaignValue(value), undefined, value);
  }
  assert.deepEqual(sanitizeCampaign({ utm_source: 'instagram', email: 'private@example.com', utm_term: 'private@example.com' }), { utm_source: 'instagram' });
});

test('attribution uses normalized sources or a category; no referrer path is returned', () => {
  assert.equal(campaignChannel('fb', ''), 'facebook');
  assert.equal(campaignChannel('ig', ''), 'instagram');
  assert.equal(campaignChannel('tt', ''), 'tiktok');
  assert.equal(campaignChannel(undefined, 'https://www.google.com/search?q=private'), 'organic');
  assert.equal(campaignChannel(undefined, 'https://l.instagram.com/private-path'), 'instagram');
  assert.equal(campaignChannel(undefined, 'https://facebook.com.example.org/'), 'referral');
  assert.equal(campaignChannel(undefined, ''), 'direct');
});

test('page URL cannot bypass UTM sanitization through a provider automatic PageView', () => {
  const input = 'https://example.com/?utm_source=Instagram&utm_term=person%40example.com&email=person%40example.com&fbclid=IwAR_test1234567890#contenido';
  assert.equal(sanitizeTrackingUrl(input), 'https://example.com/?utm_source=instagram&fbclid=IwAR_test1234567890#contenido');
  assert.equal(sanitizeTrackingUrl('https://example.com/?phone=51999888777#person@example.com'), 'https://example.com/');
});

test('a tall mobile section becomes meaningful without requiring an impossible 50% section ratio', () => {
  const required = requiredVisibleArea(360, 1800, 360, 800);
  assert.equal(required, 360 * 400);
  assert.equal(isMeaningfulExposure(360 * 399, required), false);
  assert.equal(isMeaningfulExposure(360 * 400, required), true);
  assert.equal(isMeaningfulExposure(360 * 1, required), false);
  assert.equal(isMeaningfulExposure(0, 0), false);
});

test('a short section must expose half its own area', () => {
  const required = requiredVisibleArea(1200, 300, 1440, 900);
  assert.equal(required, 1200 * 150);
  assert.equal(isMeaningfulExposure(1200 * 149, required), false);
  assert.equal(isMeaningfulExposure(1200 * 150, required), true);
});

test('active time accumulates across visits; hidden time with a null start contributes nothing', () => {
  const firstVisit = accumulatedVisibleTime(0, 1000, 6500);
  const hidden = accumulatedVisibleTime(firstVisit, null, 70000);
  const secondVisit = accumulatedVisibleTime(hidden, 71000, 75500);
  assert.equal(firstVisit, 5500);
  assert.equal(hidden, 5500);
  assert.equal(secondVisit, 10000);
  assert.equal(accumulatedVisibleTime(secondVisit, 75500, 999999), 60000);
  assert.equal(nextEngagementDelay(5500), 4500);
  assert.equal(nextEngagementDelay(10000), 20000);
  assert.equal(nextEngagementDelay(30000), 30000);
  assert.equal(nextEngagementDelay(60000), null);
});

test('events remain deduplicated after the session ledger is serialized and restored', () => {
  const ledger = createEventLedger(null);
  assert.equal(claimEvent(ledger, 'section_curriculum_view'), true);
  assert.equal(claimEvent(ledger, 'section_curriculum_view'), false);
  assert.equal(claimEvent(ledger, 'faq_open:experience'), true);
  const restored = createEventLedger(JSON.parse(JSON.stringify([...ledger])));
  assert.equal(claimEvent(restored, 'section_curriculum_view'), false);
  assert.equal(claimEvent(restored, 'faq_open:programming'), true);
  assert.equal(createEventLedger([null, { event: 'bad' }, '<script>']).size, 0);
});

function withFakeBrowser(run: (scripts: Array<Record<string, unknown>>) => void): void {
  const previous = ['window', 'document'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const scripts: Array<Record<string, unknown>> = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ dataset: {} }), head: { append: (script: Record<string, unknown>) => scripts.push(script) } },
  });
  try { run(scripts); } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test('providers stay dormant before start and Clarity receives current consentv2 keys', () => {
  withFakeBrowser((scripts) => {
    const clarity = createClarity('testproject');
    const meta = createMeta('1234567890');
    clarity.event('landing_view');
    meta.event('whatsapp_click');
    tiktok.start({ channel: 'direct' });
    assert.equal(scripts.length, 0);
    assert.equal(typeof window.clarity, 'undefined');
    assert.equal(typeof window.fbq, 'undefined');
    clarity.start({ channel: 'instagram' });
    clarity.start({ channel: 'instagram' });
    assert.equal(scripts.length, 1);
    assert.deepEqual(window.clarity?.q?.[0], ['consentv2', { ad_Storage: 'granted', analytics_Storage: 'granted' }]);
    clarity.revoke();
    assert.deepEqual(window.clarity?.q?.at(-1), ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }]);
  });
});

test('Meta receives only a pageview, real conversion, and meaningful curriculum engagement', () => {
  withFakeBrowser(() => {
    const meta = createMeta('1234567890');
    meta.start({ channel: 'facebook' });
    meta.event('faq_open', { faq_id: 'experience' });
    meta.event('scroll_50');
    meta.event('section_curriculum_view');
    meta.event('section_engaged', { section: 'instructor', seconds_bucket: '10+' });
    meta.event('section_engaged', { section: 'curriculum', seconds_bucket: '30+' });
    meta.event('section_engaged', { section: 'curriculum', seconds_bucket: '10+' });
    meta.event('whatsapp_click', { cta_location: 'hero' });
    const events = window.fbq?.queue.filter(([command]) => command === 'track').map(([, event]) => event);
    assert.deepEqual(events, ['PageView', 'ViewContent', 'Contact']);
    meta.revoke();
    assert.deepEqual(window.fbq?.queue.at(-1), ['consent', 'revoke']);
  });
});
