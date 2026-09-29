import { Resend } from 'resend';
import { getEnv } from '@/lib/env';
import type { NotificationPayload } from './events';
import type { NotificationProvider, SendResult } from './provider';

export class ResendNotificationProvider implements NotificationProvider {
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    const env = getEnv();
    if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required when NOTIFICATION_PROVIDER=resend.');
    this.resend = new Resend(env.RESEND_API_KEY);
    this.from = env.NOTIFICATION_FROM_EMAIL;
  }

  async send(payload: NotificationPayload): Promise<SendResult> {
    try {
      const response = await this.resend.emails.send({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      });

      if (response.error) return { ok: false, error: response.error.message };
      return { ok: true, providerMessageId: response.data?.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown email provider error' };
    }
  }
}
