import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button, ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { QrCodeCard } from '@/components/QrCodeCard';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { archiveCourse, cancelAppointmentByInstructor, closeAppointmentSlot, closeAppointmentSlotsForDay, createOfficeHourBlock, createTuesdayDemoSchedule, reopenAppointmentSlot, reopenAppointmentSlotsForDay } from '../actions';

export default async function CourseDetailPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams?: Promise<{ success?: string; error?: string }> }) {
  const { courseId } = await params;
  const query = searchParams ? await searchParams : {};
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
    supabase.from('appointment_slots').select('id, starts_at, ends_at, status, appointments(id,status,topic_description,students(full_name,email),topic_categories(label))').eq('course_id', courseId).order('starts_at').limit(80),
    supabase.from('office_hour_sessions').select('id, starts_at, ends_at, status, running_delay_minutes').eq('course_id', courseId).order('starts_at', { ascending: false }).limit(5),
    supabase.from('office_hour_schedules').select('*').eq('course_id', courseId).order('day_of_week')
  ]);

  const studentUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/c/${course.public_slug}`;

  const slotsByDate = (slots ?? []).reduce((groups: Record<string, any[]>, slot: any) => {
    const date = new Date(slot.starts_at);
    const key = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);

    return groups;
  }, {});

  const slotGroups = Object.entries(slotsByDate);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {(query.success || query.error) ? (
            <div className="fixed left-1/2 top-20 z-50 w-[min(92vw,720px)] -translate-x-1/2">
              {query.success ? (
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-success shadow-xl">
                  <span>{query.success}</span>
                  <a href={`/dashboard/courses/${course.id}`} className="shrink-0 text-xs font-bold text-success">Dismiss</a>
                </div>
              ) : null}

              {query.error ? (
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-danger shadow-xl">
                  <span>{query.error}</span>
                  <a href={`/dashboard/courses/${course.id}`} className="shrink-0 text-xs font-bold text-danger">Dismiss</a>
                </div>
              ) : null}
            </div>
          ) : null}

          <Card>
            <p className="text-sm font-semibold uppercase tracking-wide text-campus">{course.terms?.name}</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
            <p className="mt-2 text-slate-600">{course.title}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={studentUrl} variant="secondary">Open student page</ButtonLink>
              {sessions?.[0] ? <ButtonLink href={`/dashboard/live/${sessions[0].id}`}>Open live dashboard</ButtonLink> : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-ink">Create office-hour block</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create real appointment slots for this course. This replaces the old demo-only workflow.
            </p>

            <form action={createOfficeHourBlock} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="courseId" value={course.id} />

              <label className="block text-sm font-medium text-ink">
                Date
                <input required type="date" name="date" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>

              <label className="block text-sm font-medium text-ink">
                Slot length
                <select name="slotLengthMinutes" defaultValue={course.default_appointment_minutes ?? 20} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-ink">
                Start time
                <input required type="time" name="startTime" defaultValue="14:00" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>

              <label className="block text-sm font-medium text-ink">
                End time
                <input required type="time" name="endTime" defaultValue="16:00" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>

              <label className="block text-sm font-medium text-ink">
                Location, optional
                <input name="location" defaultValue={course.office_location ?? ''} placeholder="Office, room, or building" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>

              <label className="block text-sm font-medium text-ink">
                Virtual meeting link, optional
                <input name="virtualMeetingUrl" defaultValue={course.virtual_meeting_url ?? ''} placeholder="https://..." className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" name="makeLiveQueueActive" value="true" className="mt-1" />
                Also start the live walk-in queue for this block now.
              </label>

              <div className="sm:col-span-2">
                <Button type="submit">Create office-hour block</Button>
              </div>
            </form>

            <details className="mt-5 rounded-2xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold text-ink">Demo helper</summary>
              <p className="mt-2 text-sm text-slate-600">
                For quick testing only, this creates Tuesday 2:00–4:00 PM office hours and opens a live queue.
              </p>
              <form action={createTuesdayDemoSchedule} className="mt-4">
                <input type="hidden" name="courseId" value={course.id} />
                <Button type="submit" variant="secondary">Create Tuesday 2–4 demo schedule</Button>
              </form>
            </details>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-ink">Schedules and sessions</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="font-semibold text-ink">Recurring schedules</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {(schedules ?? []).map((schedule: any) => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return (
                      <li key={schedule.id} className="rounded-xl bg-slate-50 p-3">
                        {dayNames[schedule.day_of_week] ?? 'Selected day'}: {schedule.start_time} to {schedule.end_time}
                        {schedule.location ? <span className="block text-xs text-slate-500">{schedule.location}</span> : null}
                      </li>
                    );
                  })}
                  {(schedules ?? []).length === 0 ? <li>No schedules yet.</li> : null}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-ink">Recent sessions</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {(sessions ?? []).map((session: any) => (
                    <li key={session.id} className="rounded-xl bg-slate-50 p-3">
                      <a href={`/dashboard/live/${session.id}`} className="font-medium text-ink">
                        {new Date(session.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </a>
                      <span className="block text-xs text-slate-500">Status: {session.status}</span>
                    </li>
                  ))}
                  {(sessions ?? []).length === 0 ? <li>No sessions yet.</li> : null}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">Appointment slots</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Open a date to view slots, bookings, and closed times.
                </p>
              </div>
              <p className="text-sm text-slate-500">{(slots ?? []).length} total slots</p>
            </div>

            <div className="mt-4 space-y-3">
              {slotGroups.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No appointment slots yet.</p>
              ) : (
                slotGroups.map(([dateLabel, daySlots], index) => {
                  const availableCount = daySlots.filter((slot: any) => slot.status === 'available').length;
                  const closedCount = daySlots.filter((slot: any) => slot.status === 'cancelled').length;
                  const bookedCount = daySlots.filter((slot: any) =>
                    (slot.appointments ?? []).some((appt: any) => ['scheduled', 'checked_in', 'ready', 'late', 'in_session'].includes(appt.status))
                  ).length;

                  return (
                    <details key={dateLabel} open={index === 0} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-ink">{dateLabel}</p>
                            <p className="text-sm text-slate-500">{daySlots.length} slots total</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-success">{availableCount} open</span>
                            <span className="rounded-full bg-calm px-3 py-1 text-campus">{bookedCount} booked</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{closedCount} closed</span>
                          </div>
                        </div>
                      </summary>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {availableCount > 0 ? (
                          <form action={closeAppointmentSlotsForDay}>
                            <input type="hidden" name="courseId" value={course.id} />
                            {daySlots.filter((slot: any) => slot.status === 'available').map((slot: any) => (
                              <input key={slot.id} type="hidden" name="slotIds" value={slot.id} />
                            ))}
                            <Button type="submit" variant="secondary">Close all open slots for this day</Button>
                          </form>
                        ) : null}

                        {closedCount > 0 ? (
                          <form action={reopenAppointmentSlotsForDay}>
                            <input type="hidden" name="courseId" value={course.id} />
                            {daySlots.filter((slot: any) => slot.status === 'cancelled').map((slot: any) => (
                              <input key={slot.id} type="hidden" name="slotIds" value={slot.id} />
                            ))}
                            <Button type="submit" variant="secondary">Reopen closed slots for this day</Button>
                          </form>
                        ) : null}
                      </div>

                      <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        {daySlots.map((slot: any) => {
                          const appointment = (slot.appointments ?? []).find((appt: any) => ['scheduled', 'checked_in', 'ready', 'late', 'in_session'].includes(appt.status));
                          const student = appointment?.students;
                          const topic = appointment?.topic_categories;

                          return (
                            <li key={slot.id} id={appointment ? 'appointment-' + appointment.id : undefined} className="rounded-xl bg-slate-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-ink">{new Date(slot.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                  <p className="mt-1 text-slate-500">Slot status: {slot.status}</p>
                                </div>
                                {appointment ? <span className="rounded-full bg-calm px-3 py-1 text-xs font-semibold text-campus">booked</span> : null}
                              </div>

                              {appointment ? (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                  <p className="font-semibold text-ink">{student?.full_name ?? 'Unknown student'}</p>
                                  {student?.email ? <p className="text-xs text-slate-500">{student.email}</p> : null}
                                  {topic?.label ? <p className="mt-2 text-sm text-campus">{topic.label}</p> : null}
                                  {appointment.topic_description ? <p className="mt-1 text-sm text-slate-600">{appointment.topic_description}</p> : null}

                                  <form action={cancelAppointmentByInstructor} className="mt-3">
                                    <input type="hidden" name="appointmentId" value={appointment.id} />
                                    <input type="hidden" name="courseId" value={course.id} />
                                    <Button type="submit" variant="danger">Cancel student booking and reopen slot</Button>
                                  </form>
                                </div>
                              ) : (
                                <div className="mt-3">
                                  {slot.status === 'available' ? (
                                    <form action={closeAppointmentSlot}>
                                      <input type="hidden" name="slotId" value={slot.id} />
                                      <input type="hidden" name="courseId" value={course.id} />
                                      <Button type="submit" variant="secondary">Close this slot</Button>
                                    </form>
                                  ) : null}

                                  {slot.status === 'cancelled' ? (
                                    <form action={reopenAppointmentSlot}>
                                      <input type="hidden" name="slotId" value={slot.id} />
                                      <input type="hidden" name="courseId" value={course.id} />
                                      <Button type="submit" variant="secondary">Reopen this slot</Button>
                                    </form>
                                  ) : null}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })
              )}
            </div>
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

