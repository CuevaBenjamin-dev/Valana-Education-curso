import type { AnalyticsProvider } from './types.ts';

export function createClarity(projectId: string): AnalyticsProvider {
  let loaded = false;
  return {
    start(context) {
      if (loaded) return;
      loaded = true;
      window.clarity ??= Object.assign((...args: unknown[]) => {
        (window.clarity!.q ??= []).push(args);
      }, { q: [] as unknown[][] });

      // The current consent API uses these exact case-sensitive storage keys.
      // https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2
      window.clarity('consentv2', { ad_Storage: 'granted', analytics_Storage: 'granted' });
      for (const [key, value] of Object.entries(context)) window.clarity('set', key, value);

      const script = document.createElement('script');
      script.src = `https://www.clarity.ms/tag/${projectId}`;
      script.async = true;
      script.dataset.analyticsProvider = 'clarity';
      document.head.append(script);
    },
    event(name, data = {}) {
      if (!loaded) return;
      window.clarity?.('event', name);
      // Clarity events have no payload: stable tags and explicit names preserve
      // section/bucket or FAQ context without collecting visible text or URLs.
      for (const [key, value] of Object.entries(data)) window.clarity?.('set', key, value);
      if (name === 'section_engaged') window.clarity?.('event', `section_${data.section}_engaged_${data.seconds_bucket}`);
      if (name === 'faq_open') window.clarity?.('event', `faq_${data.faq_id}_open`);
    },
    revoke() {
      if (loaded) window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    },
  };
}
