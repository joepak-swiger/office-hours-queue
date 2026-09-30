import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FloatingNotice } from '@/components/FloatingNotice';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProfessorSessionLive } from './professor-session-live';

export default async function LiveSessionPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams?: Promise<{ success?: string; error?: string; notice?: string }> }) {
  const { sessionId } = await params;
  const query = searchParams ? await searchParams : {};
  const { user } = await requireProfessor();
  const supabase = await createSupabaseServerClient();

  const { data: session } = await supabase
    .from('office_hour_sessions')
    .select('id, status, running_delay_minutes, starts_at, ends_at, courses(code,title,office_location,default_appointment_minutes)')
    .eq('id', sessionId)
    .eq('professor_id', user.id)
    .single();
  if (!session) notFound();

  const { data: entries } = await supabase
    .from('queue_entries')
    .select('id, status, position, created_at, topic_description, course_section, students(full_name,email), topic_categories(label)')
    .eq('session_id', sessionId)
    .order('position');

  const active = (entries ?? []).filter((entry: any) => ['waiting', 'next', 'ready', 'checked_in', 'late', 'in_session'].includes(entry.status));
  const current = active.find((entry: any) => entry.status === 'in_session');
  const next = active.find((entry: any) => ['next', 'ready', 'checked_in', 'late', 'waiting'].includes(entry.status) && entry.id !== current?.id);

  return (
    <AppShell>
      <FloatingNotice success={query.success} error={query.error} noticeId={query.notice} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Live</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{(session as any).courses?.code}</h1>
          <p className="mt-2 text-slate-600">{(session as any).courses?.title}</p>
        </div>
        <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-success">{session.status}</span>
      </div>

      <ProfessorSessionLive sessionId={sessionId} initialCount={active.length} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-xl font-bold text-ink">Quick actions</h2>
          <form method="post" action={`/api/professor/sessions/${sessionId}/action`} className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button name="action" value="pause" variant="secondary" type="submit">Pause queue</Button>
            <Button name="action" value="resume" variant="success" type="submit">Resume queue</Button>
            <Button name="action" value="call_next" type="submit">Call next</Button>
            <Button name="action" value="complete_current" variant="secondary" type="submit">Complete current</Button>
            <Button name="action" value="delay_10" variant="secondary" type="submit">Running 10 minutes late</Button>
            <Button name="action" value="delay_20" variant="secondary" type="submit">Running 20 minutes late</Button>
            <Button name="action" value="cancel_today" variant="danger" type="submit">Cancel today's office hours</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">Current and next</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-semibold text-slate-500">Current</p>
              {current ? <StudentMiniCard entry={current as any} /> : <p className="mt-3 text-sm text-slate-600">No student in session.</p>}
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-semibold text-slate-500">Next</p>
              {next ? <StudentMiniCard entry={next as any} /> : <p className="mt-3 text-sm text-slate-600">No next student.</p>}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-xl font-bold text-ink">Waiting list</h2>
        <div className="mt-5 space-y-3">
          {active.length === 0 ? <p className="text-sm text-slate-600">No one is waiting.</p> : null}
          {active.map((entry: any, index: number) => (
            <div key={entry.id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[48px_1fr_auto] md:items-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-calm font-bold text-campus">{index + 1}</div>
              <div>
                <p className="font-bold text-ink">{entry.students?.full_name}</p>
                <p className="text-sm text-slate-600">{entry.topic_categories?.label ?? 'Topic'} · joined {new Date(entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                {entry.topic_description ? <p className="mt-1 text-sm text-slate-500">{entry.topic_description}</p> : null}
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-campus">{entry.status.replaceAll('_', ' ')}</p>
              </div>
              <form method="post" action={`/api/professor/sessions/${sessionId}/action`} className="flex flex-wrap gap-2">
                <input type="hidden" name="queueEntryId" value={entry.id} />
                <Button name="action" value="mark_ready" type="submit" className="px-3 py-2">Ready</Button>
                <Button name="action" value="start_meeting" type="submit" variant="success" className="px-3 py-2">Start</Button>
                <Button name="action" value="mark_late" type="submit" variant="secondary" className="px-3 py-2">Late</Button>
                <Button name="action" value="mark_no_show" type="submit" variant="secondary" className="px-3 py-2">No-show</Button>
                <Button name="action" value="move_down" type="submit" variant="secondary" className="px-3 py-2">Move down</Button>
                <Button name="action" value="cancel_entry" type="submit" variant="danger" className="px-3 py-2">Remove</Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function StudentMiniCard({ entry }: { entry: any }) {
  return (
    <div className="mt-3">
      <p className="text-lg font-bold text-ink">{entry.students?.full_name}</p>
      <p className="text-sm text-slate-600">{entry.topic_categories?.label}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-campus">{entry.status.replaceAll('_', ' ')}</p>
    </div>
  );
}
