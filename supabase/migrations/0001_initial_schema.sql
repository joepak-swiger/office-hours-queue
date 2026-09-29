-- Office Hours Queue v0.1.0 initial schema
-- Requires pgcrypto for gen_random_uuid/gen_random_bytes.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  role text not null default 'professor' check (role in ('professor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  academic_year text,
  starts_on date,
  ends_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professor_id, name)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  term_id uuid not null references public.terms(id) on delete cascade,
  public_slug text not null unique default replace(gen_random_uuid()::text, '-', ''),
  code text not null,
  title text not null,
  section text,
  description text,
  office_location text,
  virtual_meeting_url text,
  default_appointment_minutes integer not null default 20 check (default_appointment_minutes between 5 and 180),
  queue_warning_minutes integer not null default 10 check (queue_warning_minutes between 1 and 120),
  late_threshold_minutes integer not null default 5 check (late_threshold_minutes between 0 and 120),
  no_show_threshold_minutes integer not null default 10 check (no_show_threshold_minutes between 1 and 240),
  max_queue_size integer not null default 20 check (max_queue_size between 1 and 200),
  max_appointments_per_student integer check (max_appointments_per_student is null or max_appointments_per_student between 1 and 100),
  walk_ins_enabled boolean not null default true,
  appointments_enabled boolean not null default true,
  opening_alerts_enabled boolean not null default true,
  waitlist_enabled boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(professor_id, term_id, code, section)
);

create table if not exists public.topic_categories (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(course_id, label)
);

create table if not exists public.office_hour_schedules (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  location text,
  virtual_meeting_url text,
  recurring boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create type public.office_hour_session_status as enum ('scheduled', 'active', 'paused', 'cancelled', 'completed');
create table if not exists public.office_hour_sessions (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  schedule_id uuid references public.office_hour_schedules(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.office_hour_session_status not null default 'scheduled',
  running_delay_minutes integer not null default 0 check (running_delay_minutes >= 0),
  location_override text,
  virtual_link_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create type public.appointment_slot_status as enum ('available', 'booked', 'cancelled', 'held');
create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  schedule_id uuid references public.office_hour_schedules(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_slot_status not null default 'available',
  location text,
  virtual_meeting_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique(course_id, starts_at, ends_at)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  notification_consent boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists students_professor_lower_email_idx on public.students(professor_id, lower(email));

create type public.appointment_status as enum (
  'scheduled', 'checked_in', 'ready', 'in_session', 'completed',
  'cancelled_by_student', 'cancelled_by_instructor', 'late', 'no_show', 'rescheduled'
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  slot_id uuid not null references public.appointment_slots(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  topic_category_id uuid references public.topic_categories(id) on delete set null,
  course_section text,
  topic_description text,
  status public.appointment_status not null default 'scheduled',
  status_token text not null unique,
  cancel_token text not null unique,
  checked_in_at timestamptz,
  ready_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  wait_minutes integer,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_appointment_per_slot
  on public.appointments(slot_id)
  where status in ('scheduled', 'checked_in', 'ready', 'in_session', 'late');

create type public.queue_entry_status as enum (
  'waiting', 'next', 'ready', 'checked_in', 'in_session', 'completed',
  'cancelled', 'left_queue', 'late', 'no_show'
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  session_id uuid not null references public.office_hour_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  topic_category_id uuid references public.topic_categories(id) on delete set null,
  course_section text,
  topic_description text,
  status public.queue_entry_status not null default 'waiting',
  position integer not null check (position >= 1),
  status_token text not null unique,
  cancel_token text not null unique,
  on_my_way_at timestamptz,
  checked_in_at timestamptz,
  called_next_at timestamptz,
  ready_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  wait_minutes integer,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_queue_entry_per_student_session
  on public.queue_entries(session_id, student_id)
  where status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session');

create index if not exists queue_entries_session_position_idx on public.queue_entries(session_id, position) where status in ('waiting', 'next', 'ready', 'checked_in', 'late');

create type public.waitlist_status as enum ('waiting', 'notified', 'claimed', 'expired', 'cancelled');
create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  slot_id uuid references public.appointment_slots(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  topic_category_id uuid references public.topic_categories(id) on delete set null,
  course_section text,
  topic_description text,
  status public.waitlist_status not null default 'waiting',
  claim_token text not null unique,
  claim_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.subscription_status as enum ('active', 'cancelled', 'expired');
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  day_preference integer check (day_preference between 0 and 6),
  date_range_start date,
  date_range_end date,
  any_opening boolean not null default true,
  status public.subscription_status not null default 'active',
  unsubscribe_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  provider text not null default 'console',
  provider_message_id text,
  status public.notification_status not null default 'queued',
  error_message text,
  student_id uuid references public.students(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  queue_entry_id uuid references public.queue_entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  event_type text not null,
  source_type text not null check (source_type in ('appointment', 'queue', 'system')),
  source_id uuid,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references public.profiles(id) on delete set null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_student_status_token(prefix text)
returns text
language sql
as $$
  select prefix || '_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function public.ensure_student(
  p_professor_id uuid,
  p_full_name text,
  p_email text,
  p_notification_consent boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  insert into public.students (professor_id, full_name, email, notification_consent)
  values (p_professor_id, trim(p_full_name), lower(trim(p_email)), p_notification_consent)
  on conflict (professor_id, lower(email)) do update
    set full_name = excluded.full_name,
        notification_consent = excluded.notification_consent,
        updated_at = now()
  returning id into v_student_id;

  return v_student_id;
end;
$$;

create or replace function public.book_appointment_slot(
  p_slot_id uuid,
  p_course_id uuid,
  p_full_name text,
  p_email text,
  p_course_section text,
  p_topic_category_id uuid,
  p_topic_description text,
  p_notification_consent boolean default true
)
returns table(appointment_id uuid, status_token text, student_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot appointment_slots%rowtype;
  v_student_id uuid;
  v_status_token text := public.create_student_status_token('appt');
  v_cancel_token text := public.create_student_status_token('cancel');
  v_appointment_id uuid;
begin
  select * into v_slot
  from public.appointment_slots
  where id = p_slot_id and course_id = p_course_id
  for update;

  if not found then
    raise exception 'appointment_slot_not_found';
  end if;

  if v_slot.status <> 'available' then
    raise exception 'appointment_slot_unavailable';
  end if;

  v_student_id := public.ensure_student(v_slot.professor_id, p_full_name, p_email, p_notification_consent);

  insert into public.appointments (
    professor_id, course_id, slot_id, student_id, topic_category_id, course_section, topic_description, status_token, cancel_token
  ) values (
    v_slot.professor_id, p_course_id, p_slot_id, v_student_id, p_topic_category_id, nullif(trim(p_course_section), ''), nullif(trim(p_topic_description), ''), v_status_token, v_cancel_token
  ) returning id into v_appointment_id;

  update public.appointment_slots
  set status = 'booked', updated_at = now()
  where id = p_slot_id;

  insert into public.analytics_events(professor_id, course_id, event_type, source_type, source_id)
  values (v_slot.professor_id, p_course_id, 'appointment_booked', 'appointment', v_appointment_id);

  appointment_id := v_appointment_id;
  status_token := v_status_token;
  student_id := v_student_id;
  return next;
end;
$$;

create or replace function public.join_live_queue(
  p_session_id uuid,
  p_course_id uuid,
  p_full_name text,
  p_email text,
  p_course_section text,
  p_topic_category_id uuid,
  p_topic_description text,
  p_notification_consent boolean default true
)
returns table(queue_entry_id uuid, status_token text, student_id uuid, queue_position integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session office_hour_sessions%rowtype;
  v_course courses%rowtype;
  v_student_id uuid;
  v_position integer;
  v_queue_entry_id uuid;
  v_status_token text := public.create_student_status_token('queue');
  v_cancel_token text := public.create_student_status_token('cancel');
  v_active_count integer;
begin
  select * into v_session
  from public.office_hour_sessions
  where id = p_session_id and course_id = p_course_id
  for update;

  if not found then
    raise exception 'office_hour_session_not_found';
  end if;

  select * into v_course from public.courses where id = p_course_id;

  if v_course.walk_ins_enabled is not true then
    raise exception 'walk_ins_disabled';
  end if;

  if v_session.status not in ('active', 'paused') then
    raise exception 'office_hours_not_active';
  end if;

  select count(*) into v_active_count
  from public.queue_entries
  where session_id = p_session_id and status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session');

  if v_active_count >= v_course.max_queue_size then
    raise exception 'queue_full';
  end if;

  v_student_id := public.ensure_student(v_session.professor_id, p_full_name, p_email, p_notification_consent);

  if exists (
    select 1 from public.queue_entries
    where session_id = p_session_id and student_id = v_student_id
      and status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session')
  ) then
    raise exception 'student_already_in_queue';
  end if;

  select coalesce(max(position), 0) + 1 into v_position
  from public.queue_entries
  where session_id = p_session_id and status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session');

  insert into public.queue_entries (
    professor_id, course_id, session_id, student_id, topic_category_id, course_section, topic_description, position, status_token, cancel_token
  ) values (
    v_session.professor_id, p_course_id, p_session_id, v_student_id, p_topic_category_id, nullif(trim(p_course_section), ''), nullif(trim(p_topic_description), ''), v_position, v_status_token, v_cancel_token
  ) returning id into v_queue_entry_id;

  insert into public.analytics_events(professor_id, course_id, event_type, source_type, source_id)
  values (v_session.professor_id, p_course_id, 'queue_joined', 'queue', v_queue_entry_id);

  queue_entry_id := v_queue_entry_id;
  status_token := v_status_token;
  student_id := v_student_id;
  queue_position := v_position;
  return next;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger terms_touch_updated_at before update on public.terms for each row execute function public.touch_updated_at();
create trigger courses_touch_updated_at before update on public.courses for each row execute function public.touch_updated_at();
create trigger schedules_touch_updated_at before update on public.office_hour_schedules for each row execute function public.touch_updated_at();
create trigger sessions_touch_updated_at before update on public.office_hour_sessions for each row execute function public.touch_updated_at();
create trigger slots_touch_updated_at before update on public.appointment_slots for each row execute function public.touch_updated_at();
create trigger students_touch_updated_at before update on public.students for each row execute function public.touch_updated_at();
create trigger appointments_touch_updated_at before update on public.appointments for each row execute function public.touch_updated_at();
create trigger queue_entries_touch_updated_at before update on public.queue_entries for each row execute function public.touch_updated_at();
create trigger waitlist_touch_updated_at before update on public.waitlist_entries for each row execute function public.touch_updated_at();
create trigger subscriptions_touch_updated_at before update on public.notification_subscriptions for each row execute function public.touch_updated_at();

