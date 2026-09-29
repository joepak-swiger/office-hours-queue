export type CompletedDuration = {
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  durationMinutes?: number | null;
};

export function minutesBetween(start: string | Date, end: string | Date): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export function averageRecentDurationMinutes(
  recentCompleted: CompletedDuration[],
  defaultMinutes: number,
  sampleSize = 8
): number {
  const durations = recentCompleted
    .slice(-sampleSize)
    .map((item) => {
      if (typeof item.durationMinutes === 'number' && item.durationMinutes > 0) return item.durationMinutes;
      if (item.startedAt && item.completedAt) return minutesBetween(item.startedAt, item.completedAt);
      return null;
    })
    .filter((value): value is number => typeof value === 'number' && value > 0 && value <= 180);

  if (durations.length === 0) return defaultMinutes;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export function estimateWaitMinutes(
  peopleAhead: number,
  recentCompleted: CompletedDuration[],
  defaultMinutes: number,
  runningDelayMinutes = 0
): number {
  const average = averageRecentDurationMinutes(recentCompleted, defaultMinutes);
  return Math.max(0, peopleAhead * average + runningDelayMinutes);
}

export function formatApproxWait(minutes: number): string {
  if (minutes <= 0) return 'Very soon';
  if (minutes < 5) return 'Approximately 5 minutes';
  const rounded = Math.round(minutes / 5) * 5;
  return `Approximately ${rounded} minutes`;
}
