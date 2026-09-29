export const QUEUE_STATES = [
  'waiting',
  'next',
  'ready',
  'checked_in',
  'in_session',
  'completed',
  'cancelled',
  'left_queue',
  'late',
  'no_show'
] as const;

export type QueueState = (typeof QUEUE_STATES)[number];

export const APPOINTMENT_STATES = [
  'scheduled',
  'checked_in',
  'ready',
  'in_session',
  'completed',
  'cancelled_by_student',
  'cancelled_by_instructor',
  'late',
  'no_show',
  'rescheduled'
] as const;

export type AppointmentState = (typeof APPOINTMENT_STATES)[number];

export const QUEUE_TRANSITIONS: Record<QueueState, QueueState[]> = {
  waiting: ['next', 'checked_in', 'cancelled', 'left_queue', 'late', 'no_show'],
  next: ['ready', 'checked_in', 'waiting', 'cancelled', 'left_queue', 'late', 'no_show'],
  ready: ['in_session', 'checked_in', 'waiting', 'cancelled', 'left_queue', 'late', 'no_show'],
  checked_in: ['next', 'ready', 'in_session', 'waiting', 'cancelled', 'left_queue'],
  in_session: ['completed', 'waiting', 'cancelled'],
  completed: [],
  cancelled: ['waiting'],
  left_queue: ['waiting'],
  late: ['checked_in', 'ready', 'in_session', 'no_show', 'waiting', 'cancelled'],
  no_show: ['waiting', 'cancelled']
};

export const APPOINTMENT_TRANSITIONS: Record<AppointmentState, AppointmentState[]> = {
  scheduled: ['checked_in', 'ready', 'in_session', 'cancelled_by_student', 'cancelled_by_instructor', 'late', 'no_show', 'rescheduled'],
  checked_in: ['ready', 'in_session', 'completed', 'cancelled_by_student', 'cancelled_by_instructor'],
  ready: ['in_session', 'checked_in', 'late', 'no_show', 'cancelled_by_student', 'cancelled_by_instructor'],
  in_session: ['completed', 'scheduled', 'cancelled_by_instructor'],
  completed: [],
  cancelled_by_student: ['rescheduled'],
  cancelled_by_instructor: ['rescheduled'],
  late: ['checked_in', 'ready', 'in_session', 'no_show', 'cancelled_by_student', 'cancelled_by_instructor'],
  no_show: ['scheduled', 'cancelled_by_instructor'],
  rescheduled: ['scheduled', 'cancelled_by_student', 'cancelled_by_instructor']
};

export function canTransitionQueue(from: QueueState, to: QueueState): boolean {
  return QUEUE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionAppointment(from: AppointmentState, to: AppointmentState): boolean {
  return APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertQueueTransition(from: QueueState, to: QueueState): void {
  if (!canTransitionQueue(from, to)) {
    throw new Error(`Invalid queue transition: ${from} -> ${to}`);
  }
}

export function assertAppointmentTransition(from: AppointmentState, to: AppointmentState): void {
  if (!canTransitionAppointment(from, to)) {
    throw new Error(`Invalid appointment transition: ${from} -> ${to}`);
  }
}

export function isTerminalQueueState(state: QueueState): boolean {
  return ['completed', 'cancelled', 'left_queue', 'no_show'].includes(state);
}

export function isTerminalAppointmentState(state: AppointmentState): boolean {
  return ['completed', 'cancelled_by_student', 'cancelled_by_instructor', 'no_show'].includes(state);
}
