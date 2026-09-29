import { publicAppUrl } from '@/lib/env';
import type { NotificationPayload } from './events';

export type TemplateInput = {
  to: string;
  professorName?: string;
  courseCode?: string;
  courseTitle?: string;
  appointmentTime?: string;
  statusToken?: string;
  minutes?: number;
  location?: string;
  virtualLink?: string;
  message?: string;
};

function statusLink(token?: string): string | undefined {
  return token ? publicAppUrl(`/status/${token}`) : undefined;
}

export function appointmentBookedTemplate(input: TemplateInput): NotificationPayload {
  const link = statusLink(input.statusToken);
  const text = `Your office-hour appointment is confirmed${input.appointmentTime ? ` for ${input.appointmentTime}` : ''}.${link ? `\n\nManage your appointment: ${link}` : ''}`;
  return {
    event: 'appointment_booked',
    to: input.to,
    subject: `Office-hour appointment confirmed${input.courseCode ? ` for ${input.courseCode}` : ''}`,
    text,
    html: `<p>${text.replace(/\n/g, '<br />')}</p>`
  };
}

export function queueNextTemplate(input: TemplateInput): NotificationPayload {
  const link = statusLink(input.statusToken);
  const text = `You're next for office hours.${input.location ? ` Please begin heading to ${input.location}.` : ' Please begin heading to your instructor.'}${link ? `\n\nLive status: ${link}` : ''}`;
  return { event: 'you_are_next', to: input.to, subject: `You're next for office hours`, text, html: `<p>${text.replace(/\n/g, '<br />')}</p>` };
}

export function queueReadyTemplate(input: TemplateInput): NotificationPayload {
  const link = statusLink(input.statusToken);
  const text = `It's your turn for office hours.${input.location ? ` Please come to ${input.location} now.` : ' Please come now.'}${link ? `\n\nLive status: ${link}` : ''}`;
  return { event: 'it_is_your_turn', to: input.to, subject: `It's your turn`, text, html: `<p>${text.replace(/\n/g, '<br />')}</p>` };
}

export function runningLateTemplate(input: TemplateInput): NotificationPayload {
  const text = `Office hours are running approximately ${input.minutes ?? 10} minutes behind schedule.${input.message ? `\n\n${input.message}` : ''}`;
  return { event: 'running_late', to: input.to, subject: `Office hours update`, text, html: `<p>${text.replace(/\n/g, '<br />')}</p>` };
}

export function newOpeningTemplate(input: TemplateInput): NotificationPayload {
  const text = `A new office-hour opening is available${input.appointmentTime ? ` for ${input.appointmentTime}` : ''}.${input.message ? `\n\n${input.message}` : ''}`;
  return { event: 'new_opening_available', to: input.to, subject: `New office-hour opening`, text, html: `<p>${text.replace(/\n/g, '<br />')}</p>` };
}

export function customProfessorMessageTemplate(input: TemplateInput): NotificationPayload {
  const text = input.message ?? 'Your instructor sent an office-hours update.';
  return { event: 'professor_message', to: input.to, subject: `Office hours update`, text, html: `<p>${text.replace(/\n/g, '<br />')}</p>` };
}
