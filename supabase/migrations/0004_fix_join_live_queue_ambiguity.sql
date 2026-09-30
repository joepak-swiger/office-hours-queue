-- Office Hours Queue v0.1.2 database hotfix
-- Fixes ambiguous student_id references inside join_live_queue.

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

  select * into v_course
  from public.courses
  where id = p_course_id;

  if v_course.walk_ins_enabled is not true then
    raise exception 'walk_ins_disabled';
  end if;

  if v_session.status not in ('active', 'paused') then
    raise exception 'office_hours_not_active';
  end if;

  select count(*) into v_active_count
  from public.queue_entries qe
  where qe.session_id = p_session_id
    and qe.status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session');

  if v_active_count >= v_course.max_queue_size then
    raise exception 'queue_full';
  end if;

  v_student_id := public.ensure_student(
    v_session.professor_id,
    p_full_name,
    p_email,
    p_notification_consent
  );

  if exists (
    select 1
    from public.queue_entries qe
    where qe.session_id = p_session_id
      and qe.student_id = v_student_id
      and qe.status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session')
  ) then
    raise exception 'student_already_in_queue';
  end if;

  select coalesce(max(qe.position), 0) + 1 into v_position
  from public.queue_entries qe
  where qe.session_id = p_session_id
    and qe.status in ('waiting', 'next', 'ready', 'checked_in', 'late', 'in_session');

  insert into public.queue_entries (
    professor_id,
    course_id,
    session_id,
    student_id,
    topic_category_id,
    course_section,
    topic_description,
    position,
    status_token,
    cancel_token
  ) values (
    v_session.professor_id,
    p_course_id,
    p_session_id,
    v_student_id,
    p_topic_category_id,
    nullif(trim(p_course_section), ''),
    nullif(trim(p_topic_description), ''),
    v_position,
    v_status_token,
    v_cancel_token
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

grant execute on function public.join_live_queue(uuid, uuid, text, text, text, uuid, text, boolean)
to authenticated, service_role;
