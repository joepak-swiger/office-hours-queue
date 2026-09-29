# Edge cases

## Student cancels appointment

The student status page can mark an appointment as `cancelled_by_student`. The slot is returned to `available`. Future work should immediately notify waitlisted students first, then opening subscribers after the claim window expires.

## Professor cancels office hours

The live dashboard has **Cancel today's office hours**. The session becomes `cancelled`. Future work should send a batch cancellation email to all active queue entries and today's appointments.

## Student arrives early

The student can check in early. The professor sees the checked-in state and can still decide when to call the student.

## Student arrives late

Late/no-show thresholds are course settings. The software can mark late/no-show, but professor overrides remain allowed.

## Professor runs late

The live dashboard includes **Running 10 minutes late** and **Running 20 minutes late**. The session delay is stored and active queue members receive notification events.

## Student does not show

The professor can mark a student `no_show`. This is not automatic punishment. The professor can return a student to the queue if appropriate.

## Student joins queue then leaves

The student status page supports leaving the queue. The entry becomes `left_queue` and is excluded from active position calculations.

## Student accidentally joins twice

The database has a partial unique index preventing one active queue entry for the same student/session. The API returns a friendly error.

## Professor skips someone temporarily

The professor can move a student down the queue without deleting them.

## Office hours end while students are waiting

v0.1 preserves their queue records. Future work should add a guided close-session flow with a batch notification and optional waitlist conversion.

## Appointment runs much longer than expected

The professor can extend delay with running-late actions. Completed session duration is stored for future estimated wait-time improvements.

## Student books then joins walk-in queue

v0.1 allows this because real office-hour situations vary. A future rule can warn students when they already have a same-day appointment.

## Internet temporarily disconnects

Student and professor status pages use server-sent events and show reconnecting status. Forms still submit through normal HTTP when the connection returns.

## Email notification fails

Failed provider results are logged to `notifications` with `status = failed` and an error message. The UI should not expose provider stack traces to students.

## Appointment slot is claimed during booking

The database booking function locks the slot. Only one request can succeed. The other receives a friendly error.

## Student loses status link

v0.1 does not expose a public lookup by email because that could leak status. A professor can resend the link manually from the database/admin tooling. Future work should add a secure resend flow.

## Professor mistakenly marks someone complete

v0.1 records status changes but does not yet expose full undo. Future work should add an audit-log-backed undo action for recent professor changes.
