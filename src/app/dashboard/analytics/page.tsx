import { AppShell } from '@/components/AppShell';
import { ButtonLink } from '@/components/Button';
import { Card, StatCard } from '@/components/Card';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { summarizeVisits, type VisitLike } from '@/lib/office-hours/analytics';

export default async function AnalyticsPage() {
  const { user } = await requireProfessor();
  const supabase = await createSupabaseServerClient();
  const [{ data: appointments }, { data: queueEntries }] = await Promise.all([
    supabase.from('appointments').select('id,status,created_at,wait_minutes,duration_minutes,courses(code),topic_categories(label)').eq('professor_id', user.id),
    supabase.from('queue_entries').select('id,status,created_at,wait_minutes,duration_minutes,courses(code),topic_categories(label)').eq('professor_id', user.id)
  ]);

  const visits: VisitLike[] = [
    ...(appointments ?? []).map((item: any) => ({ id: item.id, mode: 'scheduled' as const, status: item.status, courseCode: item.courses?.code ?? 'Course', topicCategory: item.topic_categories?.label ?? 'Other', createdAt: item.created_at, waitMinutes: item.wait_minutes, durationMinutes: item.duration_minutes })),
    ...(queueEntries ?? []).map((item: any) => ({ id: item.id, mode: 'walk_in' as const, status: item.status, courseCode: item.courses?.code ?? 'Course', topicCategory: item.topic_categories?.label ?? 'Other', createdAt: item.created_at, waitMinutes: item.wait_minutes, durationMinutes: item.duration_minutes }))
  ];
  const summary = summarizeVisits(visits);

  return (
    <AppShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-campus">Analytics</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Office-hours demand</h1>
          <p className="mt-2 text-slate-600">Aggregate teaching support metrics. Individual student behavior is intentionally not emphasized here.</p>
        </div>
        <ButtonLink href="/api/analytics/export" variant="secondary">Export CSV</ButtonLink>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total visits" value={summary.totalVisits} />
        <StatCard label="Scheduled" value={summary.scheduledAppointments} />
        <StatCard label="Walk-ins" value={summary.walkInVisits} />
        <StatCard label="Completed" value={summary.completedVisits} />
        <StatCard label="Cancellations" value={summary.cancellations} />
        <StatCard label="No-shows" value={summary.noShows} />
        <StatCard label="Late arrivals" value={summary.lateArrivals} />
        <StatCard label="Avg wait" value={`${summary.averageWaitMinutes} min`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">Topic breakdown</h2>
          <div className="mt-5 space-y-3">
            {summary.topicBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm"><span>{item.label}</span><span>{item.count} · {item.percentage}%</span></div>
                <div className="mt-1 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-campus" style={{ width: `${Math.max(4, item.percentage)}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-ink">Visits by course</h2>
          <div className="mt-5 space-y-3">
            {summary.courseBreakdown.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm font-semibold"><span>{item.label}</span><span>{item.count}</span></div>
                <p className="mt-1 text-xs text-slate-500">{item.percentage}% of tracked visits</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
