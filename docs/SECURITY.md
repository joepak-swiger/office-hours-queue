# Security and privacy

Office Hours Queue is FERPA-aware by design, but v0.1 is not represented as FERPA-certified or legally reviewed.

## Current protections

- Professor accounts use Supabase Auth.
- Student accounts are not required in v0.1.
- Student status pages use unguessable status tokens.
- Service-role credentials stay server-side only.
- `.env.local` and other secret files are ignored by Git.
- Row Level Security is enabled on application tables.
- Professor-scoped tables use policies tied to `auth.uid()`.
- Public student flows go through Next.js Route Handlers rather than exposing broad anon database access.
- Appointment booking is protected by database-level locking and uniqueness.
- CSV analytics export omits student names and emails by default.

## Data minimization

The student form asks for:

- full name
- email
- course
- optional section
- topic category
- optional short description

The form warns students not to enter highly sensitive personal or medical details. The app intentionally avoids grades, disability details, medical details, and GPS tracking.

## Security tests to run before deployment

- Professor A cannot select Professor B courses.
- Professor A cannot select Professor B students.
- Student A cannot access Student B status by ID.
- Student actions require the private status token.
- Booking the same slot twice fails.
- Direct anon database reads do not expose sensitive tables.
- `.env.local` is not committed.
- Service role key appears only in server-side code and local environment variables.

## Rate limiting

v0.1 documents rate limiting but does not include a production-grade rate limiter. Before public deployment, add provider-level or middleware rate limiting to public form endpoints:

- `/api/appointments/book`
- `/api/queue/join`
- `/api/openings/subscribe`

## Data retention

Default documented policy for v0.1:

- Detailed records remain during the active academic year.
- After the academic year, instructors should archive terms.
- A future task should anonymize older individual records while retaining aggregate analytics.

Do not promise institutional compliance until reviewed by the relevant university process.
