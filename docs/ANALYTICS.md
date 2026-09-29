# Analytics

The analytics dashboard favors aggregate faculty-useful statistics instead of exposing individual student behavior.

## Current metrics

- total visits
- scheduled appointments
- walk-ins
- completed visits
- cancellations
- no-shows
- late arrivals
- average wait
- average duration
- topic breakdown
- course breakdown
- CSV export

## Time periods

The v0.1 code contains the data needed for today/this week/month/semester/year filters, but the first UI view is intentionally simple. Terms preserve semester/year context. Archived terms remain available for historical reports.

## CSV export

`/api/analytics/export` exports aggregate-safe rows with:

- mode
- status
- course code
- topic category
- created_at
- wait_minutes
- duration_minutes

It does not export student name, email, or free-text topic descriptions by default.

## Faculty activity record

The data can support statements like:

> 112 office-hour student consultations during the 2026–27 academic year.

The app should not claim that this satisfies any specific university reporting requirement.
