import { NextRequest, NextResponse } from 'next/server';
import { bookAppointmentSchema } from '@/lib/validation';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { appointmentBookedTemplate } from '@/lib/notifications/templates';
import { sendNotification } from '@/lib/notifications';
import { asFriendlyMessage } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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
    const url = new URL('/', request.url);
    url.searchParams.set('error', asFriendlyMessage(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}
