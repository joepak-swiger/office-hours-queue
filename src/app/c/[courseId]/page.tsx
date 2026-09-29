import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { PublicShell } from '@/components/PublicShell';
import { getActiveSession, getAvailableSlots, getPublicCourse } from '@/lib/data';

export default async function PublicCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await getPublicCourse(courseId);
  if (!course) notFound();
  const [slots, activeSession] = await Promise.all([getAvailableSlots(course.id), getActiveSession(course.id)]);

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Queue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-1 text-lg text-slate-700">{course.title}</p>
        {course.office_location ? <p className="mt-4 rounded-2xl bg-calm p-3 text-sm text-campus">Location: {course.office_location}</p> : null}
        <div className="mt-6 grid gap-3">
          {course.appointments_enabled ? <ButtonLink href={`/c/${course.public_slug}/book`}>Book an appointment</ButtonLink> : null}
          {course.walk_ins_enabled ? <ButtonLink href={`/c/${course.public_slug}/queue`} variant="secondary">Join today's queue</ButtonLink> : null}
          {course.opening_alerts_enabled ? <ButtonLink href={`/c/${course.public_slug}/notify`} variant="secondary">Notify me of openings</ButtonLink> : null}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold text-ink">Appointments</h2>
          <p className="mt-2 text-sm text-slate-600">{slots.length} available upcoming slots.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-ink">Live queue</h2>
          <p className="mt-2 text-sm text-slate-600">{activeSession ? `Queue is ${activeSession.status}.` : 'No active live queue right now.'}</p>
        </Card>
      </div>
    </PublicShell>
  );
}
