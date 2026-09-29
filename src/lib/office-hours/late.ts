export type LateDecision = 'on_time' | 'late' | 'no_show';

export function appointmentLateDecision(
  startsAt: string | Date,
  now: string | Date,
  lateThresholdMinutes: number,
  noShowThresholdMinutes: number
): LateDecision {
  const elapsed = Math.floor((new Date(now).getTime() - new Date(startsAt).getTime()) / 60000);
  if (elapsed >= noShowThresholdMinutes) return 'no_show';
  if (elapsed >= lateThresholdMinutes) return 'late';
  return 'on_time';
}
