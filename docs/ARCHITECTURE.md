# Architecture

Office Hours Queue v0.1.0 is a mobile-first Next.js web app backed by Supabase Postgres, Supabase Auth, Row Level Security, and a server-side notification abstraction.

```mermaid
flowchart LR
  Student[Student phone from QR] --> PublicPages[Next.js public course pages]
  PublicPages --> API[Route Handlers / Server Actions]
  Professor[Professor browser] --> Dashboard[Professor dashboard]
  Dashboard --> Auth[Supabase Auth]
  API --> Service[Server-only Supabase service client]
  Dashboard --> RLS[Supabase anon client with Auth session + RLS]
  Service --> DB[(Supabase Postgres)]
  RLS --> DB
  API --> Notify[Notification provider]
  Notify --> Console[Console provider]
  Notify --> Resend[Resend provider]
  Status[Private student status page] --> SSE[Server-sent events]
  SSE --> DB
```

## Main design choices

- Professors authenticate with Supabase Auth.
- Students do not create accounts in v0.1.
- Student booking/status access uses unguessable status tokens generated server-side.
- Public student pages use Next.js server code, not unrestricted direct database access.
- Professor-owned data is protected with Row Level Security policies using `professor_id = auth.uid()`.
- Appointment booking uses a database transaction function that locks the appointment slot before claiming it.
- Live status uses server-sent events. This avoids polling every second and can be swapped for Supabase Realtime later.
- Notifications use a provider interface. Local development uses the console provider. Production can use Resend.

## Modes

### Scheduled appointments

1. Professor creates a course and schedule.
2. Appointment slots are generated for the office-hour window.
3. Student chooses a slot and submits identifying information.
4. `book_appointment_slot` locks the slot and creates the appointment.
5. The student is redirected to `/status/[token]`.
6. Confirmation notification is sent if enabled.

### Live walk-in queue

1. Professor starts or creates an office-hour session.
2. Student scans QR and chooses Join Today's Queue.
3. `join_live_queue` checks queue capacity and duplicate active queue entries.
4. The student receives a private live status page.
5. Professor actions update queue state and send operational notifications.

## State machines

Queue states:

```mermaid
stateDiagram-v2
  waiting --> next
  waiting --> checked_in
  waiting --> cancelled
  waiting --> left_queue
  waiting --> late
  next --> ready
  next --> checked_in
  next --> waiting
  ready --> in_session
  checked_in --> next
  checked_in --> ready
  checked_in --> in_session
  late --> checked_in
  late --> ready
  late --> in_session
  late --> no_show
  in_session --> completed
```

Appointment states:

```mermaid
stateDiagram-v2
  scheduled --> checked_in
  scheduled --> ready
  scheduled --> in_session
  scheduled --> late
  scheduled --> no_show
  scheduled --> cancelled_by_student
  scheduled --> cancelled_by_instructor
  checked_in --> ready
  ready --> in_session
  in_session --> completed
  late --> checked_in
  late --> ready
  late --> no_show
  no_show --> scheduled
  cancelled_by_student --> rescheduled
  cancelled_by_instructor --> rescheduled
  rescheduled --> scheduled
```

Professor overrides are allowed where a real instructor may know circumstances the software does not.
