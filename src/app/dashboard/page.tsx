import { AppShell } from '@/components/AppShell';
import { ButtonLink } from '@/components/Button';
import { Card, StatCard } from '@/components/Card';
import { getProfessorDashboard, requireProfessor } from '@/lib/data';

export default async function DashboardPage() {
  const { user, profile } = await requireProfessor();
  const dashboard = await getProfessorDashboard(user.id);

  return (
    <AppShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-campus">Professor dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h1>
          <p className="mt-2 text-slate-600">Manage appointments, live queue, QR codes, and aggregate office-hours analytics.</p>
        </div>
        <ButtonLink href="/dashboard/courses/new">Create course</ButtonLink>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active courses" value={dashboard.courses.length} helper="Not archived" />
        <StatCard label="Active live sessions" value={dashboard.sessions.length} helper="Running or paused" />
        <StatCard label="Active queue" value={dashboard.activeWaiting} helper="Students still needing attention" />
        <StatCard label="Total tracked interactions" value={dashboard.appointmentCount + dashboard.queueCount} helper="All-time appointments + queue joins" />
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Upcoming appointments</h2>
            <p className="mt-1 text-sm text-slate-600">Booked student appointments that still need attention.</p>
          </div>
          <ButtonLink href="/dashboard/courses" variant="secondary">Manage schedules</ButtonLink>
        </div>

        <div className="mt-5 space-y-3">
          {dashboard.upcomingAppointments.length === 0 ? (
            <p className="rounded-2xl bg-calm p-4 text-sm text-campus">No upcoming booked appointments yet.</p>
          ) : (
            dashboard.upcomingAppointments.map((appointment: any) => {
              const slot = appointment.appointment_slots;
              const course = appointment.courses;
              const student = appointment.students;
              const topic = appointment.topic_categories;

              return (
                <div key={appointment.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{student?.full_name ?? 'Unknown student'}</p>
                      <p className="text-sm text-slate-500">{course?.code}{course?.section ? ` - ${course.section}` : ''} - {course?.title}</p>
                      <p className="mt-2 text-sm text-slate-700">
                        {slot?.starts_at ? new Date(slot.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Time not available'}
                      </p>
                      {topic?.label ? <p className="mt-2 text-sm text-campus">{topic.label}</p> : null}
                      {appointment.topic_description ? <p className="mt-1 text-sm text-slate-600">{appointment.topic_description}</p> : null}
                    </div>
                    <span className="rounded-full bg-calm px-3 py-1 text-sm font-medium text-campus">{appointment.status.replaceAll('_', ' ')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-ink">Live office hours</h2>
            <ButtonLink href="/dashboard/courses" variant="secondary">Manage courses</ButtonLink>
          </div>
          <div className="mt-5 space-y-3">
            {dashboard.sessions.length === 0 ? (
              <p className="rounded-2xl bg-calm p-4 text-sm text-campus">No active office-hour sessions yet. Start one from a course dashboard.</p>
            ) : (
              dashboard.sessions.map((session: any) => (
                <a key={session.id} href={`/dashboard/live/${session.id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-campus">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{session.courses?.code} - {session.courses?.title}</p>
                      <p className="text-sm text-slate-500">{new Date(session.starts_at).toLocaleString()} to {new Date(session.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-success">{session.status}</span>
                  </div>
                </a>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">Courses</h2>
          <div className="mt-5 space-y-3">
            {dashboard.courses.length === 0 ? (
              <p className="text-sm text-slate-600">Create your first term and course to generate a QR code.</p>
            ) : (
              dashboard.courses.map((course: any) => (
                <a key={course.id} href={`/dashboard/courses/${course.id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-campus">
                  <p className="font-semibold text-ink">{course.code} {course.section ? ` - ${course.section}` : ''}</p>
                  <p className="text-sm text-slate-500">{course.title}</p>
                  <p className="mt-2 text-xs text-slate-400">QR URL: /c/{course.public_slug}</p>
                </a>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

