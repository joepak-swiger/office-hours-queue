-- Suggested Supabase CLI tests. Run with: supabase test db
-- These tests document the important privacy assumptions for v0.1.
-- They are intentionally focused on cross-professor data isolation.

begin;
select plan(8);

-- This file assumes Supabase's pgTAP test helpers are available in local CLI.
-- Test data can be inserted as service_role in a before block in a fuller test harness.

select has_table('public', 'courses', 'courses table exists');
select has_table('public', 'students', 'students table exists');
select has_table('public', 'appointments', 'appointments table exists');
select has_table('public', 'queue_entries', 'queue_entries table exists');
select has_policy('public', 'courses', 'courses_professor_all', 'courses have professor RLS');
select has_policy('public', 'students', 'students_professor_all', 'students have professor RLS');
select has_policy('public', 'appointments', 'appointments_professor_all', 'appointments have professor RLS');
select has_policy('public', 'queue_entries', 'queue_entries_professor_all', 'queue entries have professor RLS');

select * from finish();
rollback;
