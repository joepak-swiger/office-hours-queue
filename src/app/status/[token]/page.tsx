import { notFound } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PublicShell } from '@/components/PublicShell';
import { getStatusByToken } from '@/lib/data';
import { estimateWaitMinutes, formatApproxWait } from '@/lib/office-hours/wait-time';
import { StudentStatusLive } from './student-status-live';

export default async function StudentStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await getStatusByToken(token);
  if (!status) notFound();

  const record: any = status.record;
  const isQueue = status.type === 'queue';
  const peopleAhead = isQueue ? Math.max(0, Number(record.position ?? 1) - 1) : 0;
  const waitMinutes = isQueue ? estimateWaitMinutes(peopleAhead, [], record.courses?.default_appointment_minutes ?? 20, record.office_hour_sessions?.running_delay_minutes ?? 0) : 0;

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Queue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Your status</h1>
        <div className="mt-6 grid gap-4 rounded-3xl bg-mist p-5">
          <div>
            <p className="text-sm text-slate-500">Course</p>
            <p className="text-xl font-bold text-ink">{record.courses?.code}</p>
            <p className="text-sm text-slate-600">{record.courses?.title}</p>
          </div>
          {isQueue ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-sm text-slate-500">Your position</p><p className="text-3xl font-bold text-ink">#{record.position}</p></div>
              <div><p className="text-sm text-slate-500">People ahead</p><p className="text-3xl font-bold text-ink">{peopleAhead}</p></div>
              <div><p className="text-sm text-slate-500">Estimated wait</p><p className="text-lg font-bold text-ink">{formatApproxWait(waitMinutes)}</p></div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500">Appointment time</p>
              <p className="text-xl font-bold text-ink">{record.appointment_slots?.starts_at ? new Date(record.appointment_slots.starts_at).toLocaleString() : 'Scheduled'}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-1 inline-flex rounded-full bg-white px-4 py-2 text-lg font-bold uppercase tracking-wide text-campus">{String(record.status).replaceAll('_', ' ')}</p>
          </div>
        </div>

        <StudentStatusLive token={token} initialStatus={record.status} />

        <form method="post" action={`/api/status/${token}/action`} className="mt-6 grid gap-3 sm:grid-cols-2">
          {isQueue ? <Button name="action" value="on_my_way" variant="secondary" type="submit">I'm on my way</Button> : null}
          <Button name="action" value="checked_in" variant="success" type="submit">I'm here</Button>
          {isQueue ? <Button name="action" value="leave_queue" variant="secondary" type="submit">Leave queue</Button> : <Button name="action" value="cancel_appointment" variant="secondary" type="submit">Cancel appointment</Button>}
        </form>
      </Card>
    </PublicShell>
  );
}
