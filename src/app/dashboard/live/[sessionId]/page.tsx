import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FloatingNotice } from '@/components/FloatingNotice';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProfessorSessionLive } from './professor-session-live';

const activeStatuses = ['waiting', 'next', 'ready', 'checked_in', 'late', 'in_session'];

const statusText: Record<string, { label: string; helper: string; className: string }> = {
  waiting: {
    label: 'Waiting',
    helper: 'Student is in the queue and waiting to be called.',
    className: 'bg-slate-100 text-slate-700'
  },
  next: {
    label: 'Called next',
    helper: 'Student has been called and should be heading over.',
    className: 'bg-calm text-campus'
  },
  ready: {
    label: 'Ready',
    helper: 'Student is ready for the meeting.',
    className: 'bg-emerald-50 text-success'
  },
  checked_in: {
    label: 'Checked in',
    helper: 'Student has checked in and is nearby.',
    className: 'bg-emerald-50 text-success'
  },
  late: {
    label: 'Late',
    helper: 'Student is marked late but still active.',
    className: 'bg-amber-50 text-warning'
  },
  in_session: {
    label: 'In session',
    helper: 'Student is currently meeting with the professor.',
    className: 'bg-campus text-white'
  }
};

export default async function LiveSessionPage({
  params,
  searchParams
}: {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<{ success?: string; error?: string; notice?: string }>;
}) {
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

  const active = (entries ?? []).filter((entry: any) => activeStatuses.includes(entry.status));
  const current = active.find((entry: any) => entry.status === 'in_session');
  const next = active.find((entry: any) => ['next', 'ready', 'checked_in', 'late', 'waiting'].includes(entry.status) && entry.id !== current?.id);
  const waitingCount = active.filter((entry: any) => entry.status !== 'in_session').length;

  return (
    <AppShell>
      <FloatingNotice success={query.success} error={query.error} noticeId={query.notice} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Live</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{(session as any).courses?.code}</h1>
          <p className="mt-2 text-slate-600">{(session as any).courses?.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-success">
            {session.status}
          </span>
          {session.running_delay_minutes ? (
            <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-warning">
              Running {session.running_delay_minutes} min late
            </span>
          ) : null}
        </div>
      </div>

      <ProfessorSessionLive sessionId={sessionId} initialCount={active.length} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Queue controls</h2>
              <p className="mt-2 text-sm text-slate-600">
                Use these for the whole office-hour session.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {waitingCount} waiting
            </span>
          </div>

          <form method="post" action={`/api/professor/sessions/${sessionId}/action`} className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button name="action" value="call_next" type="submit">Call next student</Button>
            <Button name="action" value="complete_current" variant="success" type="submit">Complete current meeting</Button>
            <Button name="action" value="pause" variant="secondary" type="submit">Pause queue</Button>
            <Button name="action" value="resume" variant="secondary" type="submit">Resume queue</Button>
          </form>

          <details className="mt-4 rounded-2xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-ink">Delay or cancel tools</summary>
            <form method="post" action={`/api/professor/sessions/${sessionId}/action`} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button name="action" value="delay_10" variant="secondary" type="submit">Running 10 minutes late</Button>
              <Button name="action" value="delay_20" variant="secondary" type="submit">Running 20 minutes late</Button>
              <div className="sm:col-span-2">
                <Button name="action" value="cancel_today" variant="danger" type="submit">Cancel today's office hours</Button>
              </div>
            </form>
          </details>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">Current and next</h2>
          <p className="mt-2 text-sm text-slate-600">
            A quick snapshot of who is being helped now and who should be helped next.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-semibold text-slate-500">Current</p>
              {current ? <StudentMiniCard entry={current as any} /> : <p className="mt-3 text-sm text-slate-600">No student in session.</p>}
            </div>

            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-semibold text-slate-500">Next up</p>
              {next ? <StudentMiniCard entry={next as any} /> : <p className="mt-3 text-sm text-slate-600">No next student.</p>}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Student queue</h2>
            <p className="mt-1 text-sm text-slate-600">
              Each student card shows the safest actions for that student’s current status.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {active.length} active
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {active.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No one is waiting.</p> : null}

          {active.map((entry: any, index: number) => (
            <QueueEntryCard key={entry.id} entry={entry} index={index} sessionId={sessionId} />
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function QueueEntryCard({ entry, index, sessionId }: { entry: any; index: number; sessionId: string }) {
  const meta = statusText[entry.status] ?? {
    label: entry.status?.replaceAll('_', ' ') ?? 'Unknown',
    helper: 'Student is active in the queue.',
    className: 'bg-slate-100 text-slate-700'
  };

  const isCurrent = entry.status === 'in_session';
  const canPrepare = ['waiting', 'checked_in', 'late'].includes(entry.status);
  const canStart = ['waiting', 'next', 'ready', 'checked_in', 'late'].includes(entry.status);
  const canMarkLate = ['waiting', 'next', 'ready', 'checked_in'].includes(entry.status);
  const canMoveDown = ['waiting', 'next', 'ready', 'checked_in', 'late'].includes(entry.status);

  return (
    <div className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-[48px_1fr] ${isCurrent ? 'border-campus bg-calm/40' : 'border-slate-200'}`}>
      <div className="grid h-12 w-12 place-items-center rounded-full bg-calm font-bold text-campus">{index + 1}</div>

      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-bold text-ink">{entry.students?.full_name}</p>
            <p className="text-sm text-slate-600">
              {entry.topic_categories?.label ?? 'Topic'} · joined {new Date(entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
            {entry.topic_description ? <p className="mt-1 text-sm text-slate-500">{entry.topic_description}</p> : null}
          </div>

          <div className="md:text-right">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${meta.className}`}>
              {meta.label}
            </span>
            <p className="mt-2 max-w-sm text-xs text-slate-500 md:max-w-xs">{meta.helper}</p>
          </div>
        </div>

        <form method="post" action={`/api/professor/sessions/${sessionId}/action`} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="queueEntryId" value={entry.id} />

          {isCurrent ? (
            <Button name="action" value="complete_current" type="submit" variant="success" className="px-3 py-2">Complete meeting</Button>
          ) : null}

          {canPrepare ? (
            <Button name="action" value="mark_ready" type="submit" className="px-3 py-2">Mark ready</Button>
          ) : null}

          {canStart ? (
            <Button name="action" value="start_meeting" type="submit" variant="success" className="px-3 py-2">Start meeting</Button>
          ) : null}

          {canMarkLate ? (
            <Button name="action" value="mark_late" type="submit" variant="secondary" className="px-3 py-2">Mark late</Button>
          ) : null}

          {!isCurrent ? (
            <Button name="action" value="mark_no_show" type="submit" variant="secondary" className="px-3 py-2">No-show</Button>
          ) : null}

          {canMoveDown ? (
            <Button name="action" value="move_down" type="submit" variant="secondary" className="px-3 py-2">Move down</Button>
          ) : null}

          {!isCurrent ? (
            <Button name="action" value="cancel_entry" type="submit" variant="danger" className="px-3 py-2">Remove</Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function StudentMiniCard({ entry }: { entry: any }) {
  const meta = statusText[entry.status] ?? {
    label: entry.status?.replaceAll('_', ' ') ?? 'Unknown',
    helper: '',
    className: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="mt-3">
      <p className="text-lg font-bold text-ink">{entry.students?.full_name}</p>
      <p className="text-sm text-slate-600">{entry.topic_categories?.label}</p>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${meta.className}`}>
        {meta.label}
      </span>
    </div>
  );
}
