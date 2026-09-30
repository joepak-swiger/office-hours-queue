import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export const getCurrentProfessor = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile };
});

export async function requireProfessor() {
  const professor = await getCurrentProfessor();
  if (!professor) redirect('/auth/login');
  return professor;
}

export async function getProfessorDashboard(professorId: string) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const [
    { data: courses },
    { data: sessions },
    { data: appointments },
    { data: queueEntries },
    { data: upcomingAppointments }
  ] = await Promise.all([
    supabase.from('courses').select('id, code, title, section, public_slug, archived_at').eq('professor_id', professorId).is('archived_at', null).order('code'),
    supabase.from('office_hour_sessions').select('id, course_id, starts_at, ends_at, status, running_delay_minutes, courses(code,title)').eq('professor_id', professorId).in('status', ['active', 'paused']).order('starts_at'),
    supabase.from('appointments').select('id, status, created_at').eq('professor_id', professorId),
    supabase.from('queue_entries').select('id, status, created_at').eq('professor_id', professorId),
    supabase
      .from('appointments')
      .select('id, status, topic_description, course_section, created_at, appointment_slots!inner(starts_at,ends_at,location,virtual_meeting_url), courses(code,title,section), students(full_name,email), topic_categories(label)')
      .eq('professor_id', professorId)
      .in('status', ['scheduled', 'checked_in', 'ready', 'late', 'in_session'])
      .gte('appointment_slots.starts_at', now)
      .order('starts_at', { referencedTable: 'appointment_slots', ascending: true })
      .limit(6)
  ]);

  return {
    courses: courses ?? [],
    sessions: sessions ?? [],
    appointmentCount: appointments?.length ?? 0,
    queueCount: queueEntries?.length ?? 0,
    upcomingAppointments: upcomingAppointments ?? [],
    activeWaiting: queueEntries?.filter((entry) => ['waiting', 'next', 'ready', 'checked_in', 'late'].includes(entry.status)).length ?? 0
  };
}

export async function getPublicCourse(courseIdOrSlug: string) {
  const supabase = createSupabaseServiceClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseIdOrSlug);
  const query = supabase
    .from('courses')
    .select('id, professor_id, term_id, public_slug, code, title, section, office_location, virtual_meeting_url, default_appointment_minutes, walk_ins_enabled, appointments_enabled, opening_alerts_enabled, waitlist_enabled, topic_categories(id,label,sort_order)')
    .is('archived_at', null)
    .order('sort_order', { referencedTable: 'topic_categories', ascending: true });

  const { data: course, error } = isUuid
    ? await query.eq('id', courseIdOrSlug).maybeSingle()
    : await query.eq('public_slug', courseIdOrSlug).maybeSingle();

  if (error) throw error;
  return course;
}

export async function getAvailableSlots(courseId: string) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('appointment_slots')
    .select('id, starts_at, ends_at, location, virtual_meeting_url')
    .eq('course_id', courseId)
    .eq('status', 'available')
    .gte('starts_at', now)
    .order('starts_at')
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getActiveSession(courseId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('office_hour_sessions')
    .select('id, starts_at, ends_at, status, running_delay_minutes, location_override, virtual_link_override')
    .eq('course_id', courseId)
    .in('status', ['active', 'paused'])
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStatusByToken(token: string) {
  const supabase = createSupabaseServiceClient();
  const [queueResult, appointmentResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .select('id, session_id, status, position, status_token, topic_description, course_section, created_at, on_my_way_at, checked_in_at, called_next_at, ready_at, started_at, completed_at, wait_minutes, duration_minutes, courses(code,title,public_slug,office_location,virtual_meeting_url,default_appointment_minutes,queue_warning_minutes), students(full_name,email), topic_categories(label), office_hour_sessions(status,running_delay_minutes)')
      .eq('status_token', token)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('id, status, status_token, topic_description, course_section, created_at, checked_in_at, ready_at, started_at, completed_at, wait_minutes, duration_minutes, appointment_slots(starts_at,ends_at,location,virtual_meeting_url), courses(code,title,public_slug,office_location,virtual_meeting_url), students(full_name,email), topic_categories(label)')
      .eq('status_token', token)
      .maybeSingle()
  ]);

  if (queueResult.error) throw queueResult.error;
  if (appointmentResult.error) throw appointmentResult.error;

  if (queueResult.data) {
    const { data: activeEntries } = await supabase
      .from('queue_entries')
      .select('id, position, status, created_at, started_at, completed_at')
      .eq('session_id', (queueResult.data as any).session_id)
      .in('status', ['waiting', 'next', 'ready', 'checked_in', 'late'])
      .order('position');
    return { type: 'queue' as const, record: queueResult.data, activeEntries: activeEntries ?? [] };
  }

  if (appointmentResult.data) return { type: 'appointment' as const, record: appointmentResult.data, activeEntries: [] };
  return null;
}

