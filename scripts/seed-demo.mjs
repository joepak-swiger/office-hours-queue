import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_PROFESSOR_EMAIL ?? 'demo.professor@example.com';
const password = process.env.DEMO_PROFESSOR_PASSWORD ?? 'OfficeHoursDemo123!';
const name = process.env.DEMO_PROFESSOR_NAME ?? 'Professor Minji Kang';

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local first.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing } = await supabase.auth.admin.listUsers();
let user = existing.users.find((u) => u.email === email);
if (!user) {
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
  if (created.error) throw created.error;
  user = created.data.user;
} else {
  await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { display_name: name } });
}

await supabase.from('profiles').upsert({ id: user.id, display_name: name, email, role: 'professor' });

const { data: term, error: termError } = await supabase
  .from('terms')
  .upsert({ professor_id: user.id, name: 'Fall 2026', academic_year: '2026–27' }, { onConflict: 'professor_id,name' })
  .select('id')
  .single();
if (termError) throw termError;

async function upsertCourse(code, title, section = '001') {
  const { data: course, error } = await supabase
    .from('courses')
    .insert({ professor_id: user.id, term_id: term.id, code, title, section, office_location: 'Room 214', default_appointment_minutes: 20 })
    .select('id, public_slug')
    .single();
  if (error && !String(error.message).includes('duplicate')) throw error;
  if (course) return course;
  const found = await supabase.from('courses').select('id, public_slug').eq('professor_id', user.id).eq('code', code).limit(1).single();
  return found.data;
}

const wgst101 = await upsertCourse('WGST 101', "Introduction to Women's and Gender Studies");
const wgst302 = await upsertCourse('WGST 302', 'Issues in Feminism');
const categories = ['Assignment clarification', 'Paper/project help', 'Course concept', 'Reading question', 'Exam/quiz', 'Advising', 'Graduate school/career', 'Recommendation letter', 'Attendance/course logistics', 'Other'];
for (const course of [wgst101, wgst302]) {
  for (const [index, label] of categories.entries()) {
    await supabase.from('topic_categories').upsert({ professor_id: user.id, course_id: course.id, label, sort_order: index + 1 }, { onConflict: 'course_id,label' }).select('id').maybeSingle();
  }
}

const nextTuesday = new Date();
const daysUntilTuesday = (2 - nextTuesday.getDay() + 7) % 7 || 7;
nextTuesday.setDate(nextTuesday.getDate() + daysUntilTuesday);
nextTuesday.setHours(14, 0, 0, 0);
const sessionEnd = new Date(nextTuesday);
sessionEnd.setHours(16, 0, 0, 0);

const { data: schedule } = await supabase.from('office_hour_schedules').insert({ professor_id: user.id, course_id: wgst101.id, day_of_week: 2, start_time: '14:00', end_time: '16:00', location: 'Room 214' }).select('id').single();
const { data: session } = await supabase.from('office_hour_sessions').insert({ professor_id: user.id, course_id: wgst101.id, schedule_id: schedule.id, starts_at: nextTuesday.toISOString(), ends_at: sessionEnd.toISOString(), status: 'active' }).select('id').single();

for (let cursor = new Date(nextTuesday); cursor < sessionEnd; cursor = new Date(cursor.getTime() + 20 * 60000)) {
  const end = new Date(cursor.getTime() + 20 * 60000);
  await supabase.from('appointment_slots').upsert({ professor_id: user.id, course_id: wgst101.id, schedule_id: schedule.id, starts_at: cursor.toISOString(), ends_at: end.toISOString(), status: 'available', location: 'Room 214' }, { onConflict: 'course_id,starts_at,ends_at' });
}

const { data: topic } = await supabase.from('topic_categories').select('id').eq('course_id', wgst101.id).eq('label', 'Paper/project help').single();
const demoStudents = [
  ['Jane Smith', 'jane.demo@example.com'],
  ['Alex Johnson', 'alex.demo@example.com'],
  ['Jordan Lee', 'jordan.demo@example.com']
];
for (const [index, [fullName, studentEmail]] of demoStudents.entries()) {
  const { data: studentId } = await supabase.rpc('ensure_student', { p_professor_id: user.id, p_full_name: fullName, p_email: studentEmail, p_notification_consent: true });
  await supabase.from('queue_entries').insert({ professor_id: user.id, course_id: wgst101.id, session_id: session.id, student_id: studentId, topic_category_id: topic.id, position: index + 1, status: index === 0 ? 'next' : 'waiting', status_token: `queue_demo_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`, cancel_token: `cancel_demo_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}` });
}

console.log('Demo seed complete.');
console.log(`Professor login: ${email}`);
console.log(`Password: ${password}`);
console.log(`Student course URL: ${(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')}/c/${wgst101.public_slug}`);
