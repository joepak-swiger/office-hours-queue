import { notFound } from 'next/navigation';
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

  const slotsByDate = slots.reduce((groups: Record<string, any[]>, slot: any) => {
    const date = new Date(slot.starts_at);
    const key = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);

    return groups;
  }, {});

  const slotGroups = Object.entries(slotsByDate);

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Book an appointment</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-2 text-slate-600">Choose a day and time, enter your information, and you will get a secure status link.</p>

        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger">{query.error}</p> : null}

        {slots.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-warning">
            No appointment slots are available right now. You can go back and join the live queue if it is active.
          </p>
        ) : null}

        <form method="post" action="/api/appointments/book" className="mt-6 grid gap-4 sm:grid-cols-2">
          {slotGroups.length > 0 ? (
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-ink">Choose an appointment time</legend>

              <div className="mt-3 space-y-3">
                {slotGroups.map(([dateLabel, daySlots], index) => (
                  <details key={dateLabel} open={index === 0} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-ink">{dateLabel}</p>
                          <p className="text-sm text-slate-500">{daySlots.length} open {daySlots.length === 1 ? 'time' : 'times'}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-success">
                          {daySlots.length} openings
                        </span>
                      </div>
                    </summary>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {daySlots.map((slot: any) => (
                        <label key={slot.id} className="block cursor-pointer">
                          <input required type="radio" name="slotId" value={slot.id} className="peer sr-only" />
                          <span className="block rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm transition peer-checked:border-campus peer-checked:bg-calm peer-focus:outline peer-focus:outline-2 peer-focus:outline-campus">
                            <span className="block font-semibold text-ink">
                              {new Date(slot.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <span className="mt-1 block text-slate-500">
                              Ends {new Date(slot.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {slot.location ? <span className="mt-2 block text-campus">Location: {slot.location}</span> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </fieldset>
          ) : null}

          <StudentIntakeFields categories={categories} courseId={course.id} courseSection={course.section ?? ''} />

          <div className="sm:col-span-2">
            <Button type="submit">Confirm appointment</Button>
          </div>
        </form>
      </Card>
    </PublicShell>
  );
}
