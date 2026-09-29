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
