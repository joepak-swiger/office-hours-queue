import { describe, expect, it } from 'vitest';
import { summarizeVisits, visitsToCsv } from '@/lib/office-hours/analytics';

describe('analytics', () => {
  const visits = [
    { id: '1', mode: 'scheduled' as const, status: 'completed', courseCode: 'WGST 101', topicCategory: 'Paper/project help', createdAt: '2026-09-29T14:00:00Z', waitMinutes: 0, durationMinutes: 20 },
    { id: '2', mode: 'walk_in' as const, status: 'completed', courseCode: 'WGST 101', topicCategory: 'Assignment clarification', createdAt: '2026-09-29T14:10:00Z', waitMinutes: 10, durationMinutes: 15 },
    { id: '3', mode: 'scheduled' as const, status: 'no_show', courseCode: 'WGST 302', topicCategory: 'Other', createdAt: '2026-09-29T15:00:00Z', waitMinutes: 0, durationMinutes: 0 }
  ];

  it('summarizes aggregate visit metrics', () => {
    const summary = summarizeVisits(visits);
    expect(summary.totalVisits).toBe(3);
    expect(summary.scheduledAppointments).toBe(2);
    expect(summary.walkInVisits).toBe(1);
    expect(summary.noShows).toBe(1);
    expect(summary.averageWaitMinutes).toBe(10);
  });

  it('exports aggregate-safe CSV columns', () => {
    const csv = visitsToCsv(visits);
    expect(csv).toContain('"mode","status","course_code"');
    expect(csv).not.toContain('student_email');
  });
});
