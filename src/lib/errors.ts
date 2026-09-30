export class FriendlyError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = 'friendly_error') {
    super(message);
  }
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }

  return String(error ?? '');
}

export function asFriendlyMessage(error: unknown): string {
  if (error instanceof FriendlyError) return error.message;

  const message = getErrorText(error).toLowerCase();

  if (message.includes('student_already_in_queue')) {
    return 'You are already in this live queue. Use your existing status link, or ask your instructor to remove the old queue entry before joining again.';
  }

  if (message.includes('queue_full')) {
    return 'This live queue is currently full. Please try again later or contact your instructor.';
  }

  if (message.includes('office_hours_not_active')) {
    return 'This live queue is not active right now.';
  }

  if (message.includes('walk_ins_disabled')) {
    return 'This course is not accepting live queue walk-ins right now.';
  }

  if (message.includes('duplicate')) {
    return 'That spot was claimed by someone else. Please choose another time.';
  }

  return 'Something went wrong. Please try again, or contact your instructor if this keeps happening.';
}