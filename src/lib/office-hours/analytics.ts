export type VisitLike = {
  id: string;
  mode: 'scheduled' | 'walk_in';
  status: string;
  courseCode: string;
  topicCategory: string;
  createdAt: string | Date;
  waitMinutes?: number | null;
  durationMinutes?: number | null;
};

export type AnalyticsSummary = {
  totalVisits: number;
  scheduledAppointments: number;
  walkInVisits: number;
  completedVisits: number;
  cancellations: number;
  noShows: number;
  lateArrivals: number;
  averageWaitMinutes: number;
  averageDurationMinutes: number;
  topicBreakdown: { label: string; count: number; percentage: number }[];
  courseBreakdown: { label: string; count: number; percentage: number }[];
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function breakdown(values: string[], total: number): { label: string; count: number; percentage: number }[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, percentage: total === 0 ? 0 : Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function summarizeVisits(visits: VisitLike[]): AnalyticsSummary {
  const total = visits.length;
  const cancellations = visits.filter((visit) => visit.status.includes('cancelled') || visit.status === 'left_queue').length;

  return {
    totalVisits: total,
    scheduledAppointments: visits.filter((visit) => visit.mode === 'scheduled').length,
    walkInVisits: visits.filter((visit) => visit.mode === 'walk_in').length,
    completedVisits: visits.filter((visit) => visit.status === 'completed').length,
    cancellations,
    noShows: visits.filter((visit) => visit.status === 'no_show').length,
    lateArrivals: visits.filter((visit) => visit.status === 'late').length,
    averageWaitMinutes: average(visits.map((visit) => visit.waitMinutes ?? 0).filter((value) => value > 0)),
    averageDurationMinutes: average(visits.map((visit) => visit.durationMinutes ?? 0).filter((value) => value > 0)),
    topicBreakdown: breakdown(visits.map((visit) => visit.topicCategory || 'Other'), total),
    courseBreakdown: breakdown(visits.map((visit) => visit.courseCode || 'Unknown course'), total)
  };
}

export function visitsToCsv(visits: VisitLike[]): string {
  const header = ['mode', 'status', 'course_code', 'topic_category', 'created_at', 'wait_minutes', 'duration_minutes'];
  const rows = visits.map((visit) => [
    visit.mode,
    visit.status,
    visit.courseCode,
    visit.topicCategory,
    new Date(visit.createdAt).toISOString(),
    String(visit.waitMinutes ?? ''),
    String(visit.durationMinutes ?? '')
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
