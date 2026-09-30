import { notFound } from 'next/navigation';
import { AppointmentSlotPicker } from '@/components/AppointmentSlotPicker';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PublicShell } from '@/components/PublicShell';
import { StudentIntakeFields } from '@/components/StudentIntakeFields';
import { getAvailableSlots, getPublicCourse } from '@/lib/data';

export default async function BookPage({
  params,
  searchParams
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const query = searchParams ? await searchParams : {};
  const course = await getPublicCourse(courseId);
  if (!course) notFound();

  const slots = await getAvailableSlots(course.id);
  const categories = (course.topic_categories ?? []).map((c: any) => ({ id: c.id, label: c.label }));

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Book an appointment</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-2 text-slate-600">Choose an available day and time, enter your information, and you will get a secure status link.</p>

        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger">{query.error}</p> : null}

        {slots.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-warning">
            No appointment slots are available right now. You can go back and join the live queue if it is active.
          </p>
        ) : null}

        <form method="post" action="/api/appointments/book" className="mt-6 grid gap-4 sm:grid-cols-2">
          <AppointmentSlotPicker slots={slots} />

          <StudentIntakeFields categories={categories} courseId={course.id} courseSection={course.section ?? ''} />

          <div className="sm:col-span-2">
            <Button type="submit">Confirm appointment</Button>
          </div>
        </form>
      </Card>
    </PublicShell>
  );
}
