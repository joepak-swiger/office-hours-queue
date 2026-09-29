import { describe, expect, it } from 'vitest';
import { appointmentLateDecision } from '@/lib/office-hours/late';

describe('late and no-show logic', () => {
  it('marks on-time before threshold', () => {
    expect(appointmentLateDecision('2026-09-29T14:00:00Z', '2026-09-29T14:04:00Z', 5, 10)).toBe('on_time');
  });

  it('marks late after late threshold', () => {
    expect(appointmentLateDecision('2026-09-29T14:00:00Z', '2026-09-29T14:06:00Z', 5, 10)).toBe('late');
  });

  it('marks no-show after no-show threshold', () => {
    expect(appointmentLateDecision('2026-09-29T14:00:00Z', '2026-09-29T14:10:00Z', 5, 10)).toBe('no_show');
  });
});
