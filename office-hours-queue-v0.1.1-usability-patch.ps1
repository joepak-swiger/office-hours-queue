$ErrorActionPreference = "Stop"

$project = "E:\JOEPAK\office-hours-queue-v0.1.0"
Set-Location $project

Write-Host "Applying Office Hours Queue v0.1.1 usability/error-handling patch..." -ForegroundColor Cyan

@'
import { NextRequest, NextResponse } from 'next/server';
import { bookAppointmentSchema } from '@/lib/validation';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { appointmentBookedTemplate } from '@/lib/notifications/templates';
import { sendNotification } from '@/lib/notifications';
import { asFriendlyMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  let fallbackCourseId = '';

  try {
    const formData = await request.formData();
    fallbackCourseId = String(formData.get('courseId') ?? '').trim();

    const payload = bookAppointmentSchema.parse(Object.fromEntries(formData.entries()));
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase.rpc('book_appointment_slot', {
      p_slot_id: payload.slotId,
      p_course_id: payload.courseId,
      p_full_name: payload.fullName,
      p_email: payload.email,
      p_course_section: payload.courseSection ?? '',
      p_topic_category_id: payload.topicCategoryId,
      p_topic_description: payload.topicDescription ?? '',
      p_notification_consent: payload.notificationConsent
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.status_token) throw new Error('booking_failed');

    const { data: slot } = await supabase.from('appointment_slots').select('starts_at, courses(code,title)').eq('id', payload.slotId).single();
    if (payload.notificationConsent) {
      await sendNotification(appointmentBookedTemplate({
        to: payload.email,
        courseCode: (slot as any)?.courses?.code,
        courseTitle: (slot as any)?.courses?.title,
        appointmentTime: slot?.starts_at ? new Date(slot.starts_at).toLocaleString() : undefined,
        statusToken: result.status_token
      }));
    }

    return NextResponse.redirect(new URL(`/status/${result.status_token}`, request.url), { status: 303 });
  } catch (error) {
    console.error('[appointment-book-failed]', error);
    const path = fallbackCourseId ? `/c/${fallbackCourseId}/book` : '/';
    const url = new URL(path, request.url);
    url.searchParams.set('error', asFriendlyMessage(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}
'@ | Set-Content -LiteralPath "src\app\api\appointments\book\route.ts"

@'
import { NextRequest, NextResponse } from 'next/server';
import { joinQueueSchema } from '@/lib/validation';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { asFriendlyMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  let fallbackCourseId = '';

  try {
    const formData = await request.formData();
    fallbackCourseId = String(formData.get('courseId') ?? '').trim();

    const payload = joinQueueSchema.parse(Object.fromEntries(formData.entries()));
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase.rpc('join_live_queue', {
      p_session_id: payload.sessionId,
      p_course_id: payload.courseId,
      p_full_name: payload.fullName,
      p_email: payload.email,
      p_course_section: payload.courseSection ?? '',
      p_topic_category_id: payload.topicCategoryId,
      p_topic_description: payload.topicDescription ?? '',
      p_notification_consent: payload.notificationConsent
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.status_token) throw new Error('queue_join_failed');

    return NextResponse.redirect(new URL(`/status/${result.status_token}`, request.url), { status: 303 });
  } catch (error) {
    console.error('[queue-join-failed]', error);
    const path = fallbackCourseId ? `/c/${fallbackCourseId}/queue` : '/';
    const url = new URL(path, request.url);
    url.searchParams.set('error', asFriendlyMessage(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}
'@ | Set-Content -LiteralPath "src\app\api\queue\join\route.ts"

@'
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { asFriendlyMessage } from '@/lib/errors';
import { secureToken } from '@/lib/tokens';

const schema = z.object({
  courseId: z.string().uuid(),
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  dayPreference: z.string().regex(/^[0-6]$/).optional().or(z.literal('')),
  dateRangeEnd: z.string().optional().or(z.literal(''))
});

export async function POST(request: NextRequest) {
  let fallbackCourseId = '';

  try {
    const formData = await request.formData();
    fallbackCourseId = String(formData.get('courseId') ?? '').trim();

    const payload = schema.parse(Object.fromEntries(formData.entries()));
    const supabase = createSupabaseServiceClient();
    const { data: course } = await supabase.from('courses').select('id, professor_id, public_slug').eq('id', payload.courseId).single();
    if (!course) throw new Error('course_not_found');

    const { data: studentId } = await supabase.rpc('ensure_student', {
      p_professor_id: course.professor_id,
      p_full_name: payload.fullName,
      p_email: payload.email,
      p_notification_consent: true
    });

    await supabase.from('notification_subscriptions').insert({
      professor_id: course.professor_id,
      course_id: course.id,
      student_id: studentId,
      student_name: payload.fullName,
      student_email: payload.email.toLowerCase(),
      day_preference: payload.dayPreference ? Number(payload.dayPreference) : null,
      date_range_end: payload.dateRangeEnd || null,
      any_opening: true,
      status: 'active',
      unsubscribe_token: secureToken('unsub')
    });

    return NextResponse.redirect(new URL(`/c/${course.public_slug}?subscribed=1`, request.url), { status: 303 });
  } catch (error) {
    console.error('[opening-subscribe-failed]', error);
    const path = fallbackCourseId ? `/c/${fallbackCourseId}/notify` : '/';
    const url = new URL(path, request.url);
    url.searchParams.set('error', asFriendlyMessage(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}
'@ | Set-Content -LiteralPath "src\app\api\openings\subscribe\route.ts"

Write-Host "API route patch done. Applying page patch..."

@'
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { PublicShell } from '@/components/PublicShell';
import { getActiveSession, getAvailableSlots, getPublicCourse } from '@/lib/data';

export default async function PublicCoursePage({
  params,
  searchParams
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string; subscribed?: string }>;
}) {
  const { courseId } = await params;
  const query = searchParams ? await searchParams : {};
  const course = await getPublicCourse(courseId);
  if (!course) notFound();
  const [slots, activeSession] = await Promise.all([getAvailableSlots(course.id), getActiveSession(course.id)]);

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Queue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-1 text-lg text-slate-700">{course.title}</p>

        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger">{query.error}</p> : null}
        {query.subscribed ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-success">You are subscribed to opening alerts for this course.</p> : null}

        {course.office_location ? <p className="mt-4 rounded-2xl bg-calm p-3 text-sm text-campus">Location: {course.office_location}</p> : null}
        <div className="mt-6 grid gap-3">
          {course.walk_ins_enabled ? <ButtonLink href={`/c/${course.public_slug}/queue`}>Join today's queue</ButtonLink> : null}
          {course.appointments_enabled ? <ButtonLink href={`/c/${course.public_slug}/book`} variant={activeSession ? 'secondary' : 'primary'}>Book an appointment</ButtonLink> : null}
          {course.opening_alerts_enabled ? <ButtonLink href={`/c/${course.public_slug}/notify`} variant="secondary">Notify me of openings</ButtonLink> : null}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold text-ink">Live queue</h2>
          <p className="mt-2 text-sm text-slate-600">{activeSession ? `Queue is ${activeSession.status}.` : 'No active live queue right now.'}</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-ink">Appointments</h2>
          <p className="mt-2 text-sm text-slate-600">{slots.length} available upcoming slots.</p>
        </Card>
      </div>
    </PublicShell>
  );
}
'@ | Set-Content -LiteralPath "src\app\c\[courseId]\page.tsx"

Write-Host "Public course page patch done."

@'
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

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Book an appointment</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-2 text-slate-600">Choose an open time, enter your information, and you will get a secure status link.</p>
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger">{query.error}</p> : null}
        {slots.length === 0 ? <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-warning">No appointment slots are available right now. You can go back and join the live queue if it is active.</p> : null}
        <form method="post" action="/api/appointments/book" className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink sm:col-span-2">Available time
            <select required name="slotId" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="">Choose a time</option>
              {slots.map((slot: any) => <option key={slot.id} value={slot.id}>{new Date(slot.starts_at).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</option>)}
            </select>
          </label>
          <StudentIntakeFields categories={categories} courseId={course.id} />
          <div className="sm:col-span-2"><Button type="submit">Confirm appointment</Button></div>
        </form>
      </Card>
    </PublicShell>
  );
}
'@ | Set-Content -LiteralPath "src\app\c\[courseId]\book\page.tsx"

@'
import { notFound } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PublicShell } from '@/components/PublicShell';
import { StudentIntakeFields } from '@/components/StudentIntakeFields';
import { getActiveSession, getPublicCourse } from '@/lib/data';

export default async function QueuePage({
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
  const session = await getActiveSession(course.id);
  const categories = (course.topic_categories ?? []).map((c: any) => ({ id: c.id, label: c.label }));

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Join today's queue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-2 text-slate-600">Students in the queue cannot see each other's names, topics, or personal information.</p>
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger">{query.error}</p> : null}
        {!session ? <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-warning">There is no active live queue right now.</p> : null}
        {session ? (
          <form method="post" action="/api/queue/join" className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="sessionId" value={session.id} />
            <StudentIntakeFields categories={categories} courseId={course.id} />
            <div className="sm:col-span-2"><Button type="submit">Join queue</Button></div>
          </form>
        ) : null}
      </Card>
    </PublicShell>
  );
}
'@ | Set-Content -LiteralPath "src\app\c\[courseId]\queue\page.tsx"

Write-Host "Student pages patch done. Applying course archive patch..."

# Lightweight text patches for archive action and button
$actionsPath = "src\app\dashboard\courses\actions.ts"
$actions = Get-Content -LiteralPath $actionsPath -Raw
if ($actions -notmatch "export async function archiveCourse") {
  $insert = @'

export async function archiveCourse(formData: FormData) {
  const { user } = await requireProfessor();
  const courseId = String(formData.get('courseId') ?? '').trim();
  if (!courseId) throw new Error('Course is required.');

  const supabase = await createSupabaseServerClient();

  await supabase
    .from('office_hour_sessions')
    .update({ status: 'cancelled' })
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
'@
  $actions = $actions.Replace("export async function createTuesdayDemoSchedule", $insert + "`n`nexport async function createTuesdayDemoSchedule")
  Set-Content -LiteralPath $actionsPath -Value $actions
}

$coursePagePath = "src\app\dashboard\courses\[courseId]\page.tsx"
$coursePage = Get-Content -LiteralPath $coursePagePath -Raw
$coursePage = $coursePage.Replace("import { createTuesdayDemoSchedule } from '../actions';", "import { archiveCourse, createTuesdayDemoSchedule } from '../actions';")
if ($coursePage -notmatch "Archive course") {
  $archiveCard = @'

          <Card>
            <h2 className="text-xl font-bold text-danger">Archive course</h2>
            <p className="mt-2 text-sm text-slate-600">Use this for accidental test courses. Archiving hides the course instead of deleting historical records.</p>
            <form action={archiveCourse} className="mt-4">
              <input type="hidden" name="courseId" value={course.id} />
              <Button type="submit" variant="danger">Archive this course</Button>
            </form>
          </Card>
'@
  $coursePage = $coursePage.Replace("        </div>`r`n        <aside", $archiveCard + "        </div>`r`n        <aside")
  $coursePage = $coursePage.Replace("        </div>`n        <aside", $archiveCard + "        </div>`n        <aside")
  Set-Content -LiteralPath $coursePagePath -Value $coursePage
}

Write-Host "Patch files written. Run npm checks next." -ForegroundColor Green
