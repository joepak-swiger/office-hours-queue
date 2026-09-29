# Deployment

## Recommended v0.1 deployment

- Vercel for Next.js hosting
- Supabase for Postgres/Auth/RLS
- Resend for transactional email

## Environment variables

Set the same values from `.env.example` in the deployment provider.

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- database passwords

Only `NEXT_PUBLIC_*` variables are intended for browser access.

## Supabase setup

1. Create a Supabase project.
2. In SQL Editor, run `0001_initial_schema.sql`.
3. Run `0002_security_policies.sql`.
4. In Auth settings, enable email/password and/or magic links.
5. Copy Project URL, anon key, and service role key into `.env.local` and deployment environment variables.

## Email setup

For local testing, keep `NOTIFICATION_PROVIDER=console`.

For real email:

1. Create a Resend account.
2. Verify a sender domain.
3. Add `RESEND_API_KEY`.
4. Change `NOTIFICATION_PROVIDER=resend`.
5. Set `NOTIFICATION_FROM_EMAIL` to a verified sender.

## HTTPS

Use HTTPS for production. Vercel and Supabase provide HTTPS endpoints by default.
