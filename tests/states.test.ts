import { describe, expect, it } from 'vitest';
import { canTransitionAppointment, canTransitionQueue, assertQueueTransition } from '@/lib/office-hours/states';

describe('state machines', () => {
  it('allows expected queue transitions', () => {
    expect(canTransitionQueue('waiting', 'next')).toBe(true);
    expect(canTransitionQueue('next', 'ready')).toBe(true);
    expect(canTransitionQueue('ready', 'in_session')).toBe(true);
    expect(canTransitionQueue('in_session', 'completed')).toBe(true);
  });

  it('blocks impossible queue transitions', () => {
    expect(canTransitionQueue('completed', 'waiting')).toBe(false);
    expect(() => assertQueueTransition('completed', 'ready')).toThrow(/Invalid queue transition/);
  });

  it('allows professor overrides for appointment late/no-show', () => {
    expect(canTransitionAppointment('late', 'checked_in')).toBe(true);
    expect(canTransitionAppointment('no_show', 'scheduled')).toBe(true);
  });
});
