-- Office Hours Queue v0.1.0 RLS policies
-- Public student traffic goes through Next.js Route Handlers using server-only service credentials.
-- Browser clients only use the anon key for professor auth sessions and never receive the service role key.

revoke execute on all functions in schema public from public;
grant execute on function public.book_appointment_slot(uuid, uuid, text, text, text, uuid, text, boolean) to authenticated, service_role;
grant execute on function public.join_live_queue(uuid, uuid, text, text, text, uuid, text, boolean) to authenticated, service_role;
grant execute on function public.ensure_student(uuid, text, text, boolean) to service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'terms', 'courses', 'topic_categories', 'office_hour_schedules', 'office_hour_sessions',
    'appointment_slots', 'students', 'appointments', 'queue_entries', 'waitlist_entries',
    'notification_subscriptions', 'notifications', 'analytics_events', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "terms_professor_all" on public.terms
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "courses_professor_all" on public.courses
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "topic_categories_professor_all" on public.topic_categories
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "schedules_professor_all" on public.office_hour_schedules
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "sessions_professor_all" on public.office_hour_sessions
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "slots_professor_all" on public.appointment_slots
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "students_professor_all" on public.students
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "appointments_professor_all" on public.appointments
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "queue_entries_professor_all" on public.queue_entries
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "waitlist_professor_all" on public.waitlist_entries
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "subscriptions_professor_all" on public.notification_subscriptions
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "notifications_professor_select" on public.notifications
  for select using (
    course_id in (select id from public.courses where professor_id = auth.uid())
    or appointment_id in (select id from public.appointments where professor_id = auth.uid())
    or queue_entry_id in (select id from public.queue_entries where professor_id = auth.uid())
  );

create policy "analytics_professor_all" on public.analytics_events
  for all using (professor_id = auth.uid()) with check (professor_id = auth.uid());

create policy "audit_professor_select" on public.audit_logs
  for select using (professor_id = auth.uid() or actor_id = auth.uid());
create policy "audit_professor_insert" on public.audit_logs
  for insert with check (professor_id = auth.uid() or actor_id = auth.uid());
