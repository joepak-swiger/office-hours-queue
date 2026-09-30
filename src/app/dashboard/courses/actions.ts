'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DEFAULT_TOPIC_CATEGORIES } from '@/lib/constants';
import { createCourseSchema } from '@/lib/validation';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createTerm(formData: FormData) {
  const { user } = await requireProfessor();
  const name = String(formData.get('name') ?? '').trim();
  const academicYear = String(formData.get('academicYear') ?? '').trim();
  if (!name) throw new Error('Term name is required.');
  const supabase = await createSupabaseServerClient();
  await supabase.from('terms').insert({ professor_id: user.id, name, academic_year: academicYear || null });
  revalidatePath('/dashboard/courses/new');
}

export async function createCourse(formData: FormData) {
  const { user } = await requireProfessor();
  const parsed = createCourseSchema.parse(Object.fromEntries(formData.entries()));
  const supabase = await createSupabaseServerClient();

  const { data: course, error } = await supabase
    .from('courses')
    .insert({
      professor_id: user.id,
      term_id: parsed.termId,
      code: parsed.code,
      title: parsed.title,
      section: parsed.section || null,
      office_location: parsed.officeLocation || null,
      virtual_meeting_url: parsed.virtualMeetingUrl || null,
      default_appointment_minutes: parsed.defaultAppointmentMinutes,
      walk_ins_enabled: parsed.walkInsEnabled,
      appointments_enabled: parsed.appointmentsEnabled,
      opening_alerts_enabled: parsed.openingAlertsEnabled,
      waitlist_enabled: parsed.waitlistEnabled
    })
    .select('id')
    .single();

  if (error) throw error;

  await supabase.from('topic_categories').insert(
    DEFAULT_TOPIC_CATEGORIES.map((label, index) => ({ professor_id: user.id, course_id: course.id, label, sort_order: index + 1 }))
  );

  revalidatePath('/dashboard/courses');
  redirect(`/dashboard/courses/${course.id}`);
}


export async function archiveCourse(formData: FormData) {
  const { user } = await requireProfessor();
  const courseId = String(formData.get('courseId') ?? '').trim();
  if (!courseId) throw new Error('Course is required.');

  const supabase = await createSupabaseServerClient();

  await supabase
    .from('office_hour_sessions')
    .update({ status: 'available' })
    .eq('course_id', courseId)
    .eq('professor_id', user.id)
    .in('status', ['scheduled', 'active', 'paused']);

  await supabase
    .from('appointment_slots')
    .update({ status: 'cancelled' })
    .eq('course_id', courseId)
    .eq('professor_id', user.id)
    .eq('status', 'available');

  const { error } = await supabase
    .from('courses')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', courseId)
    .eq('professor_id', user.id);

  if (error) throw error;

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/courses');
  redirect('/dashboard/courses');
}

export async function createTuesdayDemoSchedule(formData: FormData) {
  const { user } = await requireProfessor();
  const courseId = String(formData.get('courseId'));
  const supabase = await createSupabaseServerClient();
  const { data: course } = await supabase.from('courses').select('id, default_appointment_minutes, office_location, virtual_meeting_url').eq('id', courseId).eq('professor_id', user.id).single();
  if (!course) throw new Error('Course not found.');

  const { data: schedule, error } = await supabase
    .from('office_hour_schedules')
    .insert({ professor_id: user.id, course_id: courseId, day_of_week: 2, start_time: '14:00', end_time: '16:00', location: course.office_location, virtual_meeting_url: course.virtual_meeting_url })
    .select('id')
    .single();
  if (error) throw error;

  const now = new Date();
  const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
  const sessionDate = new Date(now);
  sessionDate.setDate(now.getDate() + daysUntilTuesday);
  sessionDate.setHours(14, 0, 0, 0);
  const end = new Date(sessionDate);
  end.setHours(16, 0, 0, 0);

  await supabase.from('office_hour_sessions').insert({ professor_id: user.id, course_id: courseId, schedule_id: schedule.id, starts_at: sessionDate.toISOString(), ends_at: end.toISOString(), status: 'active' });

  const slots = [];
  for (let start = new Date(sessionDate); start < end; start = new Date(start.getTime() + course.default_appointment_minutes * 60000)) {
    const slotEnd = new Date(start.getTime() + course.default_appointment_minutes * 60000);
    slots.push({ professor_id: user.id, course_id: courseId, schedule_id: schedule.id, starts_at: start.toISOString(), ends_at: slotEnd.toISOString(), location: course.office_location, virtual_meeting_url: course.virtual_meeting_url });
  }
  await supabase.from('appointment_slots').insert(slots);
  revalidatePath(`/dashboard/courses/${courseId}`);
}



export async function cancelAppointmentByInstructor(formData: FormData) {
  const { user } = await requireProfessor();
  const appointmentId = String(formData.get('appointmentId') ?? '').trim();
  const courseId = String(formData.get('courseId') ?? '').trim();

  if (!appointmentId || !courseId) throw new Error('Appointment and course are required.');

  const supabase = await createSupabaseServerClient();

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, slot_id, course_id, professor_id, status')
    .eq('id', appointmentId)
    .eq('course_id', courseId)
    .eq('professor_id', user.id)
    .single();

  if (appointmentError) throw appointmentError;
  if (!appointment) throw new Error('Appointment not found.');

  if (['completed', 'cancelled_by_student', 'cancelled_by_instructor', 'no_show'].includes(appointment.status)) {
    redirect(`/dashboard/courses/${courseId}`);
  }

  const { error: updateAppointmentError } = await supabase
    .from('appointments')
    .update({ status: 'cancelled_by_instructor' })
    .eq('id', appointment.id)
    .eq('professor_id', user.id);

  if (updateAppointmentError) throw updateAppointmentError;

  if (appointment.slot_id) {
    const { error: updateSlotError } = await supabase
      .from('appointment_slots')
      .update({ status: 'cancelled' })
      .eq('id', appointment.slot_id)
      .eq('professor_id', user.id);

    if (updateSlotError) throw updateSlotError;
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}`);
}


export async function closeAppointmentSlot(formData: FormData) {
  const { user } = await requireProfessor();
  const slotId = String(formData.get('slotId') ?? '').trim();
  const courseId = String(formData.get('courseId') ?? '').trim();

  if (!slotId || !courseId) throw new Error('Slot and course are required.');

  const supabase = await createSupabaseServerClient();

  const { data: slot, error: slotError } = await supabase
    .from('appointment_slots')
    .select('id, course_id, professor_id, status')
    .eq('id', slotId)
    .eq('course_id', courseId)
    .eq('professor_id', user.id)
    .single();

  if (slotError) throw slotError;
  if (!slot) throw new Error('Slot not found.');

  const { error: updateSlotError } = await supabase
    .from('appointment_slots')
    .update({ status: 'cancelled' })
    .eq('id', slot.id)
    .eq('professor_id', user.id);

  if (updateSlotError) throw updateSlotError;

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}`);
}

export async function reopenAppointmentSlot(formData: FormData) {
  const { user } = await requireProfessor();
  const slotId = String(formData.get('slotId') ?? '').trim();
  const courseId = String(formData.get('courseId') ?? '').trim();

  if (!slotId || !courseId) throw new Error('Slot and course are required.');

  const supabase = await createSupabaseServerClient();

  const { data: activeAppointment } = await supabase
    .from('appointments')
    .select('id')
    .eq('slot_id', slotId)
    .eq('professor_id', user.id)
    .in('status', ['scheduled', 'checked_in', 'ready', 'late', 'in_session'])
    .maybeSingle();

  if (activeAppointment) {
    throw new Error('This slot still has an active appointment.');
  }

  const { error: updateSlotError } = await supabase
    .from('appointment_slots')
    .update({ status: 'available' })
    .eq('id', slotId)
    .eq('course_id', courseId)
    .eq('professor_id', user.id);

  if (updateSlotError) throw updateSlotError;

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}`);
}
