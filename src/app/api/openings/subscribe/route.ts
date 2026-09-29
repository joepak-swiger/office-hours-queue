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
