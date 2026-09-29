# Security test plan

Run these before any real pilot.

## Database/RLS

- Authenticated Professor A can read Professor A courses.
- Authenticated Professor A cannot read Professor B courses.
- Authenticated Professor A cannot read Professor B students.
- Authenticated Professor A cannot read Professor B appointments.
- Authenticated Professor A cannot read Professor B queue entries.
- Anonymous browser clients cannot list students, appointments, or queue entries directly.

## Student tokens

- A valid status token can load exactly one student's status page.
- A random token returns 404.
- A student cannot load another student's status by guessing a UUID.
- Student actions use the status token, not a raw appointment or queue ID.

## Booking race conditions

- Two simultaneous booking requests for the same slot result in one success and one failure.
- A slot marked `booked` cannot be booked again.
- Cancelling an appointment returns the slot to `available` only after appointment status changes.

## Input validation

- Invalid email is rejected.
- Overlong topic descriptions are rejected.
- Invalid course IDs are rejected.
- Invalid appointment slot IDs are rejected.
- Duplicate queue joins are rejected.

## Secrets

- `.env.local` is ignored by Git.
- `SUPABASE_SERVICE_ROLE_KEY` is only referenced in server-only files.
- `RESEND_API_KEY` is only referenced in server-side notification code.
- No API keys are present in committed files.

## Notifications

- Failed notification provider responses do not expose raw stack traces to students.
- Notification logs do not include unnecessary sensitive free-text beyond the operational message.
