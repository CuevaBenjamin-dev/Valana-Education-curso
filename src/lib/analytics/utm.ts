import { readStored, UTM_STORAGE_KEY, writeStored } from './storage.ts';

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type CampaignContext = Partial<Record<(typeof UTM_KEYS)[number], string>> & { channel: string };

/** Campaigns must use impersonal slugs. Never pass names, emails, phones, or URLs. */
export function sanitizeCampaignValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const slug = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(slug)) return undefined;
  if (slug.replace(/[^0-9]/g, '').length >= 7) return undefined;
  if (/(?:email|phone|telefono|whatsapp|address|nombre|apellido|password|token)[_-]/.test(slug)) return undefined;
  return slug;
}

export function sanitizeCampaign(input: unknown): Partial<CampaignContext> {
  if (!input || typeof input !== 'object') return {};
  const clean: Partial<CampaignContext> = {};
  for (const key of UTM_KEYS) {
    const value = sanitizeCampaignValue((input as Record<string, unknown>)[key]);
    if (value) clean[key] = value;
  }
  return clean;
}

/** SDKs also read the page URL. Only campaign slugs and Meta's click ID survive.
 * The static landing has no functional query-string parameters.
 */
export function sanitizeTrackingUrl(href: string): string {
  const url = new URL(href);
  const clean = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = sanitizeCampaignValue(url.searchParams.get(key));
    if (value) clean.set(key, value);
  }
  const fbclid = url.searchParams.get('fbclid');
  if (fbclid && /^[A-Za-z0-9_-]{10,512}$/.test(fbclid)) clean.set('fbclid', fbclid);
  url.search = clean.toString();
  if (url.hash && !/^#[a-z][a-z0-9_-]{0,63}$/i.test(url.hash)) url.hash = '';
  return url.href;
}

export function campaignChannel(source: string | undefined, referrer: string): string {
  const sourceGroups: Record<string, string> = {
    fb: 'facebook', facebook: 'facebook', ig: 'instagram', instagram: 'instagram',
    tt: 'tiktok', tiktok: 'tiktok', organic: 'organic', direct: 'direct',
  };
  if (source) return sourceGroups[source] ?? source;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/(^|\.)facebook\.com$/.test(host)) return 'facebook';
    if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
    if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
    if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(host)) return 'organic';
    return 'referral';
  } catch {
    return 'direct';
  }
}

/** Called only after acceptance. First-touch context survives internal navigation. */
export function getSessionCampaign(search: string, referrer: string): CampaignContext {
  const saved = readStored(UTM_STORAGE_KEY);
  if (saved && typeof saved === 'object') {
    const channel = sanitizeCampaignValue((saved as Record<string, unknown>).channel);
    if (channel) return { ...sanitizeCampaign(saved), channel };
  }
  const params = new URLSearchParams(search);
  const campaign = sanitizeCampaign(Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key)])));
  const context = { ...campaign, channel: campaignChannel(campaign.utm_source, referrer) };
  writeStored(UTM_STORAGE_KEY, context);
  return context;
}
