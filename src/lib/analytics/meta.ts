import type { AnalyticsProvider } from './types.ts';
import type { CampaignContext } from './utm.ts';

export function createMeta(pixelId: string): AnalyticsProvider {
  let loaded = false;
  let campaign: CampaignContext = { channel: 'direct' };
  return {
    start(context) {
      if (loaded) return;
      loaded = true;
      campaign = context;
      if (!window.fbq) {
        const fbq: NonNullable<Window['fbq']> = Object.assign((...args: unknown[]) => {
          if (fbq.callMethod) fbq.callMethod(...args);
          else fbq.queue.push(args);
        }, { queue: [] as unknown[][], loaded: true, version: '2.0' });
        fbq.push = fbq;
        window.fbq = fbq;
        window._fbq ??= fbq;
      }
      window.fbq('consent', 'grant');
      // Only the explicit PageView / Contact / ViewContent events below.
      window.fbq('set', 'autoConfig', false, pixelId);
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView', campaign);
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.async = true;
      script.dataset.analyticsProvider = 'meta';
      document.head.append(script);
    },
    event(name, data = {}) {
      if (!loaded) return;
      if (name === 'whatsapp_click') {
        window.fbq?.('track', 'Contact', { content_name: 'Curso de IA y Digitalización', ...campaign, ...data });
      }
      if (name === 'section_engaged' && data.section === 'curriculum' && data.seconds_bucket === '10+') {
        window.fbq?.('track', 'ViewContent', { content_name: 'Curso de IA y Digitalización', content_type: 'course', ...campaign });
      }
    },
    revoke() {
      if (loaded) window.fbq?.('consent', 'revoke');
    },
  };
}
