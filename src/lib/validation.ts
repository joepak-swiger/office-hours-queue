import { z } from 'zod';
import { DEFAULT_MAX_TOPIC_DESCRIPTION_LENGTH } from './constants';

export const uuidSchema = z.string().uuid();
export const statusTokenSchema = z.string().regex(/^(status|queue|appt)_[A-Za-z0-9_-]{32,}$/);

export const studentIntakeSchema = z.object({
  courseId: uuidSchema,
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(120),
  email: z.string().trim().email('Please enter a valid email address.').max(180),
  courseSection: z.string().trim().max(40).optional().or(z.literal('')),
  topicCategoryId: uuidSchema,
  topicDescription: z
    .string()
    .trim()
    .max(DEFAULT_MAX_TOPIC_DESCRIPTION_LENGTH, `Please keep the description under ${DEFAULT_MAX_TOPIC_DESCRIPTION_LENGTH} characters.`)
    .optional()
    .or(z.literal('')),
  notificationConsent: z.preprocess((value) => value === 'true' || value === 'on' || value === true, z.boolean()).default(false)
});

export const bookAppointmentSchema = studentIntakeSchema.extend({
  slotId: uuidSchema
});

export const joinQueueSchema = studentIntakeSchema.extend({
  sessionId: uuidSchema
});

export const createCourseSchema = z.object({
  termId: uuidSchema,
  code: z.string().trim().min(2).max(30),
  title: z.string().trim().min(2).max(160),
  section: z.string().trim().max(40).optional().or(z.literal('')),
  semester: z.string().trim().max(80).optional().or(z.literal('')),
  officeLocation: z.string().trim().max(160).optional().or(z.literal('')),
  virtualMeetingUrl: z.string().url().optional().or(z.literal('')),
  defaultAppointmentMinutes: z.coerce.number().int().min(5).max(180).default(20),
  walkInsEnabled: z.preprocess((value) => value === 'true' || value === 'on' || value === true, z.boolean()).default(false),
  appointmentsEnabled: z.preprocess((value) => value === 'true' || value === 'on' || value === true, z.boolean()).default(false),
  openingAlertsEnabled: z.preprocess((value) => value === 'true' || value === 'on' || value === true, z.boolean()).default(false),
  waitlistEnabled: z.preprocess((value) => value === 'true' || value === 'on' || value === true, z.boolean()).default(false)
});

export const queueActionSchema = z.object({
  action: z.enum([
    'pause',
    'resume',
    'call_next',
    'mark_ready',
    'start_meeting',
    'complete_current',
    'mark_late',
    'mark_no_show',
    'move_down',
    'cancel_entry',
    'delay_10',
    'delay_20',
    'cancel_today'
  ]),
  queueEntryId: uuidSchema.optional(),
  message: z.string().trim().max(500).optional()
});

export const statusActionSchema = z.object({
  action: z.enum(['on_my_way', 'checked_in', 'leave_queue', 'cancel_appointment', 'update_topic']),
  topicDescription: z.string().trim().max(DEFAULT_MAX_TOPIC_DESCRIPTION_LENGTH).optional()
});

export function parseFormData<T>(schema: z.ZodType<T>, data: FormData): T {
  const obj = Object.fromEntries(data.entries());
  return schema.parse(obj);
}
