import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button, ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { QrCodeCard } from '@/components/QrCodeCard';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { archiveCourse, createTuesdayDemoSchedule } from '../actions';

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { user } = await requireProfessor();
  const supabase = await createSupabaseServerClient();
  const { data: course } = await supabase
    .from('courses')
    .select('*, terms(name), topic_categories(id,label,sort_order)')
    .eq('id', courseId)
    .eq('professor_id', user.id)
    .order('sort_order', { referencedTable: 'topic_categories', ascending: true })
    .single();
  if (!course) notFound();

  const [{ data: slots }, { data: sessions }, { data: schedules }] = await Promise.all([
    supabase.from('appointment_slots').select('id, starts_at, ends_at, status').eq('course_id', courseId).order('starts_at').limit(12),
    supabase.from('office_hour_sessions').select('id, starts_at, ends_at, status, running_delay_minutes').eq('course_id', courseId).order('starts_at', { ascending: false }).limit(5),
    supabase.from('office_hour_schedules').select('*').eq('course_id', courseId).order('day_of_week')
  ]);

  const studentUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/c/${course.public_slug}`;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-campus">{course.terms?.name}</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}{course.section ? ` - ${course.section}` : ''}</h1>
            <p className="mt-2 text-slate-600">{course.title}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={studentUrl} variant="secondary">Open student page</ButtonLink>
              {sessions?.[0] ? <ButtonLink href={`/dashboard/live/${sessions[0].id}`}>Open live dashboard</ButtonLink> : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-ink">Quick setup</h2>
            <p className="mt-2 text-sm text-slate-600">For the v0.1 demo workflow, this creates Tuesday 2:00–4:00 PM office hours, appointment slots, and an active live session.</p>
            <form action={createTuesdayDemoSchedule} className="mt-4">
              <input type="hidden" name="courseId" value={course.id} />
              <Button type="submit">Create Tuesday 2–4 demo schedule</Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-ink">Schedules and sessions</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="font-semibold text-ink">Recurring schedules</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {(schedules ?? []).map((schedule: any) => <li key={schedule.id} className="rounded-xl bg-slate-50 p-3">Day {schedule.day_of_week}: {schedule.start_time}–{schedule.end_time}</li>)}
                  {(schedules ?? []).length === 0 ? <li>No schedules yet.</li> : null}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-ink">Recent sessions</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {(sessions ?? []).map((session: any) => <li key={session.id} className="rounded-xl bg-slate-50 p-3"><a href={`/dashboard/live/${session.id}`}>{new Date(session.starts_at).toLocaleString()} - {session.status}</a></li>)}
                  {(sessions ?? []).length === 0 ? <li>No sessions yet.</li> : null}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-ink">Appointment slots</h2>
            <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              {(slots ?? []).map((slot: any) => <li key={slot.id} className="rounded-xl bg-slate-50 p-3">{new Date(slot.starts_at).toLocaleString()} - {slot.status}</li>)}
              {(slots ?? []).length === 0 ? <li>No appointment slots yet.</li> : null}
            </ul>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-danger">Archive course</h2>
            <p className="mt-2 text-sm text-slate-600">Use this for accidental test courses. Archiving hides the course instead of deleting historical records.</p>
            <form action={archiveCourse} className="mt-4">
              <input type="hidden" name="courseId" value={course.id} />
              <Button type="submit" variant="danger">Archive this course</Button>
            </form>
          </Card>        </div>
        <aside className="space-y-6">
          <QrCodeCard url={studentUrl} label={`${course.code} Office Hours`} />
          <Card>
            <h2 className="text-xl font-bold text-ink">Topic categories</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {(course.topic_categories ?? []).map((category: any) => <li key={category.id} className="rounded-xl bg-slate-50 p-2">{category.label}</li>)}
            </ul>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

