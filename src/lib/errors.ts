export class FriendlyError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = 'friendly_error') {
    super(message);
  }
}

export function asFriendlyMessage(error: unknown): string {
  if (error instanceof FriendlyError) return error.message;
  if (error instanceof Error && error.message.includes('duplicate')) {
    return 'That spot was claimed by someone else. Please choose another time.';
  }
  return 'Something went wrong. Please try again, or contact your instructor if this keeps happening.';
}
