# Notifications

Notifications are abstracted behind `NotificationProvider`.

## Providers

- `console`: local development. Messages are printed to the server console.
- `resend`: production transactional email using the Resend SDK.

Set the provider with:

```env
NOTIFICATION_PROVIDER="console"
# or
NOTIFICATION_PROVIDER="resend"
```

When using Resend, set:

```env
RESEND_API_KEY="re_..."
NOTIFICATION_FROM_EMAIL="Office Hours Queue <notifications@yourdomain.edu>"
```

## Events included in v0.1 data model

- appointment booked
- appointment reminder
- you're next
- it's your turn
- running late
- student late
- missed/no-show
- appointment cancelled
- appointment rescheduled
- new opening available
- waitlist opening available
- office hours cancelled
- office location changed
- virtual link changed
- professor message

## Reminders

The local script `npm run notifications:reminders` finds scheduled appointments in the next hour and sends reminders. In production, run this through Vercel Cron, Supabase scheduled jobs, GitHub Actions, or another scheduler.

## Future channels

The provider interface is intentionally small so later versions can add:

- SMS
- native mobile push
- university email integration
- Canvas/LMS notification integrations
