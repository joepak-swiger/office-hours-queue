-- Office Hours Queue v0.1.1 database hotfix
-- Fixes status token generation on Supabase projects where gen_random_bytes is not on the public search path.

create or replace function public.create_student_status_token(prefix text)
returns text
language sql
as $$
  select prefix || '_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;
