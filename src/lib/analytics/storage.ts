/** Browser storage can be unavailable (private mode, quotas, or user policy). */
export function readStored(key: string, persistent = false): unknown {
  try {
    const value = (persistent ? localStorage : sessionStorage).getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown, persistent = false): void {
  try {
    (persistent ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    // Analytics must never interrupt navigation or consent controls.
  }
}

export function removeStored(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // The in-memory session remains usable when storage is blocked.
  }
}

export const EVENT_STORAGE_KEY = 'escs:analytics:events:v1';
export const TIME_STORAGE_KEY = 'escs:analytics:time:v1';
export const UTM_STORAGE_KEY = 'escs:analytics:utm:v1';

export function createEventLedger(initial: unknown = []): Set<string> {
  return new Set(
    Array.isArray(initial)
      ? initial.filter((item): item is string => typeof item === 'string' && /^[a-z0-9_:+-]{1,100}$/.test(item)).slice(0, 150)
      : [],
  );
}

/** A session milestone, not a count of repeated clicks. */
export function claimEvent(ledger: Set<string>, key: string): boolean {
  if (ledger.has(key)) return false;
  ledger.add(key);
  return true;
}
