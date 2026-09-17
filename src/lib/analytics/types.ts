import type { CampaignContext } from './utm.ts';

export type EventData = Record<string, string>;

export interface AnalyticsProvider {
  start(context: CampaignContext): void;
  event(name: string, data?: EventData): void;
  revoke(): void;
}

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };
type MetaFunction = ((...args: unknown[]) => void) & {
  queue: unknown[][];
  callMethod?: (...args: unknown[]) => void;
  push?: MetaFunction;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    clarity?: ClarityFunction;
    fbq?: MetaFunction;
    _fbq?: MetaFunction;
  }
}
