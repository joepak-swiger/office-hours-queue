import { notFound } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button, ButtonLink } from '@/components/Button';
import { PublicShell } from '@/components/PublicShell';
import { getStatusByToken } from '@/lib/data';
import { estimateWaitMinutes, formatApproxWait } from '@/lib/office-hours/wait-time';
import { StudentStatusLive } from './student-status-live';

const terminalQueueStatuses = new Set(['completed', 'cancelled', 'left_queue', 'no_show']);
const terminalAppointmentStatuses = new Set(['completed', 'cancelled_by_student', 'cancelled_by_instructor', 'no_show']);

export default async function StudentStatusPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = searchParams ? await searchParams : {};
  const status = await getStatusByToken(token);
  if (!status) notFound();

  const record: any = status.record;
  const isQueue = status.type === 'queue';
  const isTerminal = isQueue
    ? terminalQueueStatuses.has(record.status)
    : terminalAppointmentStatuses.has(record.status);

  const peopleAhead = isQueue && !isTerminal ? Math.max(0, Number(record.position ?? 1) - 1) : 0;
  const waitMinutes = isQueue && !isTerminal
    ? estimateWaitMinutes(
        peopleAhead,
        [],
        record.courses?.default_appointment_minutes ?? 20,
        record.office_hour_sessions?.running_delay_minutes ?? 0
      )
    : 0;

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Queue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Your status</h1>

        {query.error ? (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {query.error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 rounded-3xl bg-mist p-5">
          <div>
            <p className="text-sm text-slate-500">Course</p>
            <p className="text-xl font-bold text-ink">{record.courses?.code}</p>
            <p className="text-sm text-slate-600">{record.courses?.title}</p>
          </div>

          {isQueue ? (
            isTerminal ? (
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-campus">Queue closed</p>
                <p className="mt-2 text-slate-700">
                  You are no longer in the active queue. This page remains as a receipt of your last queue status, but it cannot be used to check in again.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">Your position</p>
                  <p className="text-3xl font-bold text-ink">#{record.position}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">People ahead</p>
                  <p className="text-3xl font-bold text-ink">{peopleAhead}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estimated wait</p>
                  <p className="text-lg font-bold text-ink">{formatApproxWait(waitMinutes)}</p>
                </div>
              </div>
            )
          ) : (
            <div>
              <p className="text-sm text-slate-500">Appointment time</p>
              <p className="text-xl font-bold text-ink">
                {record.appointment_slots?.starts_at ? new Date(record.appointment_slots.starts_at).toLocaleString() : 'Scheduled'}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-1 inline-flex rounded-full bg-white px-4 py-2 text-lg font-bold uppercase tracking-wide text-campus">
              {String(record.status).replaceAll('_', ' ')}
            </p>
          </div>
        </div>

        <StudentStatusLive token={token} initialStatus={record.status} />

        {isTerminal ? (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
            <p className="font-semibold text-ink">No further student actions are available from this status link.</p>
            <p className="mt-1">To join again, return to the course office-hours page and submit a new queue request.</p>
          </div>
        ) : (
          <form method="post" action={`/api/status/${token}/action`} className="mt-6 grid gap-3 sm:grid-cols-2">
            {isQueue ? (
              <Button name="action" value="on_my_way" variant="secondary" type="submit">
                I'm on my way
              </Button>
            ) : null}
            <Button name="action" value="checked_in" variant="success" type="submit">
              I'm here
            </Button>
            {isQueue ? (
              <Button name="action" value="leave_queue" variant="secondary" type="submit">
                Leave queue
              </Button>
            ) : (
              <Button name="action" value="cancel_appointment" variant="secondary" type="submit">
                Cancel appointment
              </Button>
            )}
          </form>
        )}

        {record.courses?.public_slug ? (
          <div className="mt-4">
            <ButtonLink href={`/c/${record.courses.public_slug}`} variant="secondary">
              Back to course office-hours page
            </ButtonLink>
          </div>
        ) : null}
      </Card>
    </PublicShell>
  );
}
