export const NOTIFICATION_EVENTS = [
  'appointment_booked',
  'appointment_reminder',
  'you_are_next',
  'it_is_your_turn',
  'running_late',
  'student_late',
  'missed_no_show',
  'appointment_cancelled',
  'appointment_rescheduled',
  'new_opening_available',
  'waitlist_opening_available',
  'office_hours_cancelled',
  'office_location_changed',
  'virtual_link_changed',
  'professor_message'
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationPayload = {
  event: NotificationEvent;
  to: string;
  subject: string;
  text: string;
  html?: string;
  studentId?: string;
  courseId?: string;
  appointmentId?: string;
  queueEntryId?: string;
};
