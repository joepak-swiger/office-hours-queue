import { describe, expect, it } from 'vitest';
import { averageRecentDurationMinutes, estimateWaitMinutes, formatApproxWait } from '@/lib/office-hours/wait-time';

describe('wait time estimates', () => {
  it('uses recent completed duration when available', () => {
    const average = averageRecentDurationMinutes([
      { durationMinutes: 10 },
      { durationMinutes: 20 },
      { startedAt: '2026-09-29T14:00:00Z', completedAt: '2026-09-29T14:15:00Z' }
    ], 20);
    expect(average).toBe(15);
  });

  it('falls back to default appointment duration', () => {
    expect(estimateWaitMinutes(2, [], 20)).toBe(40);
  });

  it('adds running delay and formats approximate values', () => {
    expect(estimateWaitMinutes(1, [{ durationMinutes: 12 }], 20, 10)).toBe(22);
    expect(formatApproxWait(22)).toBe('Approximately 20 minutes');
  });
});
