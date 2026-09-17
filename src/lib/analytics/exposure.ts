export const ENGAGEMENT_SECONDS = [10, 30, 60] as const;

/** Half the smaller section/viewport area, so tall mobile sections are measurable. */
export function requiredVisibleArea(width: number, height: number, viewportWidth: number, viewportHeight: number): number {
  return Math.max(0, Math.min(width, viewportWidth)) * Math.max(0, Math.min(height, viewportHeight)) * 0.5;
}

export function isMeaningfulExposure(visibleArea: number, requiredArea: number): boolean {
  return requiredArea > 0 && visibleArea >= requiredArea;
}

export function accumulatedVisibleTime(total: number, startedAt: number | null, now: number): number {
  return Math.min(60_000, total + (startedAt === null ? 0 : Math.max(0, now - startedAt)));
}

export function nextEngagementDelay(elapsed: number): number | null {
  const next = ENGAGEMENT_SECONDS.find((seconds) => seconds * 1000 > elapsed);
  return next === undefined ? null : next * 1000 - elapsed;
}
