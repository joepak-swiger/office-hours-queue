import type { NotificationPayload } from './events';

export type SendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<SendResult>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<SendResult> {
    console.info('[notification:console]', JSON.stringify(payload, null, 2));
    return { ok: true, providerMessageId: `console_${Date.now()}` };
  }
}
