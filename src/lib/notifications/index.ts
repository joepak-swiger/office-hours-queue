import { getEnv } from '@/lib/env';
import type { NotificationPayload } from './events';
import { ConsoleNotificationProvider } from './provider';
import { ResendNotificationProvider } from './resend';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function sendNotification(payload: NotificationPayload) {
  const env = getEnv();
  const provider = env.NOTIFICATION_PROVIDER === 'resend' ? new ResendNotificationProvider() : new ConsoleNotificationProvider();
  const result = await provider.send(payload);

  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from('notifications').insert({
      event: payload.event,
      recipient_email: payload.to,
      subject: payload.subject,
      body: payload.text,
      provider: env.NOTIFICATION_PROVIDER,
      provider_message_id: result.providerMessageId ?? null,
      status: result.ok ? 'sent' : 'failed',
      error_message: result.error ?? null,
      student_id: payload.studentId ?? null,
      course_id: payload.courseId ?? null,
      appointment_id: payload.appointmentId ?? null,
      queue_entry_id: payload.queueEntryId ?? null
    });
  } catch (error) {
    console.warn('[notification-log-failed]', error);
  }

  return result;
}
