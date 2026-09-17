import type { AnalyticsProvider } from './types.ts';

/** Reserved adapter. No script, endpoint, cookie, or event is loaded/sent.
 * Before enabling: implement this interface, configure an ID, update the
 * privacy notice, and register it behind the same consent gate in index.ts.
 */
export const tiktok: AnalyticsProvider = {
  start() {},
  event() {},
  revoke() {},
};
