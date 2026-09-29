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
