import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { secureToken } from '@/lib/tokens';

const schema = z.object({
  courseId: z.string().uuid(),
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  dayPreference: z.string().regex(/^[0-6]$/).optional().or(z.literal('')),
  dateRangeEnd: z.string().optional().or(z.literal(''))
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payload = schema.parse(Object.fromEntries(formData.entries()));
  const supabase = createSupabaseServiceClient();
  const { data: course } = await supabase.from('courses').select('id, professor_id, public_slug').eq('id', payload.courseId).single();
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

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
    unsubscribe_token: secureToken('unsub')
  });

  return NextResponse.redirect(new URL(`/c/${course.public_slug}?subscribed=1`, request.url), { status: 303 });
}
