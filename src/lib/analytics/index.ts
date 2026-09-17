import { createClarity } from './clarity.ts';
import { clearProviderCookies, CONSENT_STORAGE_KEY, readConsent, saveConsent, type ConsentChoice } from './consent.ts';
import { accumulatedVisibleTime, ENGAGEMENT_SECONDS, isMeaningfulExposure, nextEngagementDelay, requiredVisibleArea } from './exposure.ts';
import { createMeta } from './meta.ts';
import { claimEvent, createEventLedger, EVENT_STORAGE_KEY, readStored, removeStored, TIME_STORAGE_KEY, UTM_STORAGE_KEY, writeStored } from './storage.ts';
import type { AnalyticsProvider, EventData } from './types.ts';
import { getSessionCampaign, sanitizeTrackingUrl } from './utm.ts';

const SECTIONS = ['problem', 'outcomes', 'curriculum', 'methodology', 'instructor', 'course_info', 'faq'] as const;
type SectionName = (typeof SECTIONS)[number];
type SectionState = {
  name: SectionName;
  element: HTMLElement;
  elapsed: number;
  startedAt: number | null;
  viewedTimer?: number;
  engagementTimer?: number;
};

let initialized = false;

/** The single public entry point; no provider or event exists before acceptance. */
export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const clarityId = import.meta.env.PUBLIC_CLARITY_PROJECT_ID?.trim() ?? '';
  const metaId = import.meta.env.PUBLIC_META_PIXEL_ID?.trim() ?? '';
  const providers: AnalyticsProvider[] = [];
  if (/^[a-z0-9]{5,24}$/i.test(clarityId)) providers.push(createClarity(clarityId));
  if (/^[0-9]{5,25}$/.test(metaId)) providers.push(createMeta(metaId));
  // TikTok deliberately stays unregistered; see tiktok.ts before enabling it.

  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const preferenceButtons = document.querySelectorAll<HTMLButtonElement>('button[data-consent-settings]');
  if (!providers.length) {
    if (banner) banner.hidden = true;
    preferenceButtons.forEach((button) => { button.hidden = true; });
    return;
  }

  let active = false;
  let cleanupTracking = () => {};
  let returnFocus: HTMLElement | null = null;

  const activate = () => {
    if (active) return;
    const context = getSessionCampaign(location.search, document.referrer);
    try {
      const cleanUrl = sanitizeTrackingUrl(location.href);
      if (cleanUrl !== location.href) history.replaceState(history.state, '', cleanUrl);
    } catch {
      // If a restricted browser cannot remove untrusted query values, do not
      // expose them through an SDK's automatic page-URL capture.
      return;
    }
    active = true;
    providers.forEach((provider) => provider.start(context));
    cleanupTracking = observeLanding((name, data) => {
      if (active) providers.forEach((provider) => provider.event(name, data));
    });
  };

  const showBanner = (focus = false) => {
    if (!banner) return;
    banner.hidden = false;
    if (focus) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      banner.focus();
    }
  };

  const applyChoice = (choice: ConsentChoice, persist = true) => {
    if (persist) saveConsent(choice);
    if (banner) banner.hidden = true;
    returnFocus?.focus();
    returnFocus = null;
    if (choice === 'all') {
      activate();
      return;
    }
    const wasActive = active;
    active = false;
    cleanupTracking();
    providers.forEach((provider) => provider.revoke());
    clearProviderCookies();
    [EVENT_STORAGE_KEY, TIME_STORAGE_KEY, UTM_STORAGE_KEY].forEach(removeStored);
    if (wasActive) {
      // Clarity's denied mode can still perform cookieless measurement.
      // Unload all SDKs after revocation rather than leaving that mode running.
      location.reload();
    }
  };

  banner?.querySelector<HTMLButtonElement>('[data-consent-accept]')?.addEventListener('click', () => applyChoice('all'));
  banner?.querySelector<HTMLButtonElement>('[data-consent-essential]')?.addEventListener('click', () => applyChoice('essential'));
  preferenceButtons.forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => showBanner(true));
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== CONSENT_STORAGE_KEY) return;
    const choice = readConsent();
    if (choice) applyChoice(choice, false);
  });

  const choice = readConsent();
  if (choice) applyChoice(choice, false);
  else showBanner();
}

function observeLanding(send: (name: string, data?: EventData) => void): () => void {
  const controller = new AbortController();
  const signal = controller.signal;
  const ledger = createEventLedger(readStored(EVENT_STORAGE_KEY));
  const savedTime = readStored(TIME_STORAGE_KEY) as Record<string, unknown> | null;
  const sections: SectionState[] = SECTIONS.flatMap((name) => {
    const element = document.querySelector<HTMLElement>(`[data-analytics-section="${name}"]`);
    if (!element) return [];
    const stored = savedTime?.[name];
    const elapsed = typeof stored === 'number' && Number.isFinite(stored) ? Math.min(60_000, Math.max(0, stored)) : 0;
    return [{ name, element, elapsed, startedAt: null }];
  });

  const emitOnce = (name: string, data?: EventData, key = name) => {
    if (!claimEvent(ledger, key)) return;
    writeStored(EVENT_STORAGE_KEY, [...ledger]);
    send(name, data);
  };
  const saveTime = () => writeStored(TIME_STORAGE_KEY, Object.fromEntries(sections.map((state) => [state.name, state.elapsed])));
  if (sections.length) emitOnce('landing_view');

  const emitEngagement = (state: SectionState) => {
    for (const seconds of ENGAGEMENT_SECONDS) {
      if (state.elapsed >= seconds * 1000) {
        emitOnce('section_engaged', { section: state.name, seconds_bucket: `${seconds}+` }, `section_engaged:${state.name}:${seconds}`);
      }
    }
  };

  const scheduleEngagement = (state: SectionState) => {
    const delay = nextEngagementDelay(state.elapsed);
    if (delay === null) return;
    state.engagementTimer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible' || state.startedAt === null) return;
      // A timer may run late: confirm the section still qualifies before counting.
      if (!isCurrentlyVisible(state.element)) { setVisible(state, false); return; }
      const now = performance.now();
      state.elapsed = accumulatedVisibleTime(state.elapsed, state.startedAt, now);
      state.startedAt = now;
      emitEngagement(state);
      saveTime();
      scheduleEngagement(state);
    }, Math.ceil(delay) + 1);
  };

  const setVisible = (state: SectionState, visible: boolean) => {
    if (visible === (state.startedAt !== null)) return;
    if (visible) {
      state.startedAt = performance.now();
      if (!ledger.has(`section_${state.name}_view`)) {
        state.viewedTimer = window.setTimeout(() => {
          if (document.visibilityState === 'visible' && state.startedAt !== null && isCurrentlyVisible(state.element)) {
            emitOnce(`section_${state.name}_view`);
          }
        }, 1000);
      }
      scheduleEngagement(state);
    } else {
      state.elapsed = accumulatedVisibleTime(state.elapsed, state.startedAt, performance.now());
      state.startedAt = null;
      window.clearTimeout(state.viewedTimer);
      window.clearTimeout(state.engagementTimer);
      emitEngagement(state);
      saveTime();
    }
  };

  let observer: IntersectionObserver | undefined;
  const refreshVisibility = () => {
    sections.forEach((state) => setVisible(state, document.visibilityState === 'visible' && isCurrentlyVisible(state.element)));
  };
  const createObserver = () => {
    observer?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    // Each section has its own meaningful ratio, including sections taller than
    // the viewport. Include all ratios in one observer to avoid scroll polling.
    const thresholds = new Set([0, 1]);
    for (const { element } of sections) {
      const { width, height } = element.getBoundingClientRect();
      if (width && height) thresholds.add(requiredVisibleArea(width, height, innerWidth, innerHeight) / (width * height));
    }
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const state = sections.find(({ element }) => element === entry.target);
        if (!state) continue;
        const required = requiredVisibleArea(entry.boundingClientRect.width, entry.boundingClientRect.height, innerWidth, innerHeight);
        setVisible(state, document.visibilityState === 'visible' && isMeaningfulExposure(entry.intersectionRect.width * entry.intersectionRect.height, required));
      }
    }, { threshold: [...thresholds].sort((a, b) => a - b) });
    sections.forEach(({ element }) => observer?.observe(element));
    refreshVisibility();
  };
  createObserver();

  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(createObserver);
  };
  window.addEventListener('resize', onResize, { passive: true, signal });
  // Opening a long FAQ can change the section ratio without a viewport resize.
  const sizeObserver = 'ResizeObserver' in window ? new ResizeObserver(onResize) : undefined;
  sections.forEach(({ element }) => sizeObserver?.observe(element));
  document.addEventListener('visibilitychange', refreshVisibility, { signal });
  window.addEventListener('pagehide', () => sections.forEach((state) => setVisible(state, false)), { signal });
  window.addEventListener('pageshow', refreshVisibility, { signal });

  let scrollFrame = 0;
  const checkScroll = () => {
    scrollFrame = 0;
    if (document.visibilityState !== 'visible' || !sections.length) return;
    const scrollableHeight = document.documentElement.scrollHeight - innerHeight;
    if (scrollableHeight <= 0) return;
    const percentage = Math.min(100, (Math.max(0, scrollY) / scrollableHeight) * 100);
    for (const threshold of [25, 50, 75, 90]) {
      if (percentage >= threshold) emitOnce(`scroll_${threshold}`);
    }
  };
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(checkScroll);
  }, { passive: true, signal });
  checkScroll();

  document.querySelectorAll<HTMLDetailsElement>('details[data-faq-id]').forEach((details) => {
    details.addEventListener('toggle', () => {
      const id = details.dataset.faqId ?? '';
      if (details.open && /^[a-z0-9_-]{1,40}$/.test(id)) emitOnce('faq_open', { faq_id: id }, `faq_open:${id}`);
    }, { signal });
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest<HTMLAnchorElement>('a[data-cta-location][data-whatsapp-ready="true"]');
    if (!link || event.defaultPrevented) return;
    const locationName = link.dataset.ctaLocation ?? '';
    if (!/^[a-z0-9_-]{1,32}$/.test(locationName)) return;
    const url = new URL(link.href, location.origin);
    if (url.protocol !== 'https:' || url.hostname !== 'wa.me' || !/^\/[1-9][0-9]{7,14}$/.test(url.pathname)) return;
    const data = { cta_location: locationName };
    emitOnce('whatsapp_click', data);
    emitOnce(`whatsapp_${locationName}_click`, data);
  }, { signal });

  return () => {
    controller.abort();
    observer?.disconnect();
    sizeObserver?.disconnect();
    cancelAnimationFrame(scrollFrame);
    cancelAnimationFrame(resizeFrame);
    sections.forEach((state) => setVisible(state, false));
  };
}

function isCurrentlyVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const width = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left));
  const height = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
  return isMeaningfulExposure(width * height, requiredVisibleArea(rect.width, rect.height, innerWidth, innerHeight));
}
