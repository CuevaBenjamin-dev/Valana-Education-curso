import { readStored, writeStored } from './storage.ts';

export const CONSENT_STORAGE_KEY = 'escs:consent:v1';
export type ConsentChoice = 'all' | 'essential';
const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;

export function parseConsent(value: unknown, now = Date.now()): { choice: ConsentChoice; at: number } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || (record.choice !== 'all' && record.choice !== 'essential')) return null;
  if (typeof record.at !== 'number' || !Number.isFinite(record.at) || record.at > now || now - record.at > CONSENT_LIFETIME) return null;
  return { choice: record.choice, at: record.at };
}

export function readConsent(): ConsentChoice | null {
  const choices = [readStored(CONSENT_STORAGE_KEY, true), readStored(CONSENT_STORAGE_KEY)]
    .map((value) => parseConsent(value))
    .filter((value) => value !== null)
    .sort((a, b) => b.at - a.at);
  return choices[0]?.choice ?? null;
}

export function saveConsent(choice: ConsentChoice): void {
  const value = { version: 1, choice, at: Date.now() };
  writeStored(CONSENT_STORAGE_KEY, value, true);
  writeStored(CONSENT_STORAGE_KEY, value);
}

/** Revoke only known analytics cookies, including parent-domain cookies. */
export function clearProviderCookies(): void {
  const names = ['_clck', '_clsk', '_fbp', '_fbc'];
  const parts = location.hostname.split('.');
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const domain = parts.slice(index).join('.');
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
    }
  }
}
