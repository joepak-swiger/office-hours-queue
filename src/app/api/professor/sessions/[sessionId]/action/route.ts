import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { queueActionSchema } from '@/lib/validation';
import { queueNextTemplate, queueReadyTemplate, runningLateTemplate } from '@/lib/notifications/templates';
import { sendNotification } from '@/lib/notifications';

function redirectToLiveSession(
  request: NextRequest,
  sessionId: string,
  params: { success?: string; error?: string } = {}
) {
  const url = new URL(`/dashboard/live/${sessionId}`, request.url);

  if (params.success) url.searchParams.set('success', params.success);
  if (params.error) url.searchParams.set('error', params.error);

  if (params.success || params.error) {
    url.searchParams.set('notice', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  return NextResponse.redirect(url, { status: 303 });
}

function defaultActionMessage(action: string) {
  const messages: Record<string, string> = {
    pause: 'Queue paused.',
    resume: 'Queue resumed.',
    cancel_today: "Today's office hours were cancelled.",
    delay_10: 'Students were notified that office hours are running 10 minutes late.',
    delay_20: 'Students were notified that office hours are running 20 minutes late.',
    call_next: 'Next student was called.',
    complete_current: 'Current student marked complete.',
    mark_ready: 'Student marked ready.',
    start_meeting: 'Student meeting started.',
    mark_late: 'Student marked late.',
    mark_no_show: 'Student marked no-show.',
    cancel_entry: 'Student removed from the queue.',
    move_down: 'Student moved down.'
  };

  return messages[action] ?? 'Action completed.';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 });

  const formData = await request.formData();
  const payload = queueActionSchema.parse(Object.fromEntries(formData.entries()));

  let notice: { success?: string; error?: string } = {
    success: defaultActionMessage(payload.action)
  };

  const { data: session } = await supabase
    .from('office_hour_sessions')
    .select('id, professor_id, course_id, status, courses(code,title,office_location)')
    .eq('id', sessionId)
    .eq('professor_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (payload.action === 'pause') {
    await supabase.from('office_hour_sessions').update({ status: 'paused' }).eq('id', sessionId);
  }

  if (payload.action === 'resume') {
    await supabase.from('office_hour_sessions').update({ status: 'active' }).eq('id', sessionId);
  }

  if (payload.action === 'cancel_today') {
    await supabase.from('office_hour_sessions').update({ status: 'cancelled' }).eq('id', sessionId);
  }

  if (payload.action === 'delay_10' || payload.action === 'delay_20') {
    const minutes = payload.action === 'delay_10' ? 10 : 20;

    await supabase.from('office_hour_sessions').update({ running_delay_minutes: minutes }).eq('id', sessionId);

    const { data: entries } = await supabase
      .from('queue_entries')
      .select('id, students(email)')
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'next', 'ready', 'checked_in', 'late']);

    await Promise.all((entries ?? []).map((entry: any) => sendNotification(runningLateTemplate({ to: entry.students.email, minutes }))));
  }

  if (payload.action === 'call_next') {
    const { data: next } = await supabase
      .from('queue_entries')
      .select('id, status_token, students(email), courses(office_location)')
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'checked_in', 'late'])
      .order('position')
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase
        .from('queue_entries')
        .update({ status: 'next', called_next_at: new Date().toISOString() })
        .eq('id', (next as any).id);

      await sendNotification(queueNextTemplate({
        to: (next as any).students.email,
        statusToken: (next as any).status_token,
        location: (next as any).courses?.office_location
      }));
    } else {
      notice = { error: 'No waiting student to call.' };
    }
  }

  if (payload.queueEntryId) {
    if (payload.action === 'mark_ready') {
      const { data: entry } = await supabase
        .from('queue_entries')
        .select('id,status_token,students(email),courses(office_location)')
        .eq('id', payload.queueEntryId)
        .eq('professor_id', user.id)
        .single();

      if (entry) {
        await supabase
          .from('queue_entries')
          .update({ status: 'ready', ready_at: new Date().toISOString() })
          .eq('id', payload.queueEntryId);

        await sendNotification(queueReadyTemplate({
          to: (entry as any).students.email,
          statusToken: (entry as any).status_token,
          location: (entry as any).courses?.office_location
        }));
      }
    }

    if (payload.action === 'start_meeting') {
      await supabase
        .from('queue_entries')
        .update({ status: 'in_session', started_at: new Date().toISOString() })
        .eq('id', payload.queueEntryId)
        .eq('professor_id', user.id);
    }

    if (payload.action === 'mark_late') {
      await supabase
        .from('queue_entries')
        .update({ status: 'late' })
        .eq('id', payload.queueEntryId)
        .eq('professor_id', user.id);
    }

    if (payload.action === 'mark_no_show') {
      await supabase
        .from('queue_entries')
        .update({ status: 'no_show' })
        .eq('id', payload.queueEntryId)
        .eq('professor_id', user.id);
    }

    if (payload.action === 'cancel_entry') {
      await supabase
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .eq('id', payload.queueEntryId)
        .eq('professor_id', user.id);
    }

    if (payload.action === 'move_down') {
      const { data: entry } = await supabase
        .from('queue_entries')
        .select('id, position')
        .eq('id', payload.queueEntryId)
        .eq('professor_id', user.id)
        .single();

      if (entry) {
        const { data: after } = await supabase
          .from('queue_entries')
          .select('id, position')
          .eq('session_id', sessionId)
          .gt('position', (entry as any).position)
          .in('status', ['waiting', 'next', 'ready', 'checked_in', 'late'])
          .order('position')
          .limit(1)
          .maybeSingle();

        if (after) {
          await supabase.from('queue_entries').update({ position: (after as any).position }).eq('id', (entry as any).id);
          await supabase.from('queue_entries').update({ position: (entry as any).position }).eq('id', (after as any).id);
        } else {
          notice = { error: 'That student is already at the bottom of the queue.' };
        }
      }
    }
  }

  if (payload.action === 'complete_current') {
    const { data: current } = await supabase
      .from('queue_entries')
      .select('id, started_at')
      .eq('session_id', sessionId)
      .eq('status', 'in_session')
      .order('started_at')
      .limit(1)
      .maybeSingle();

    if (current) {
      const now = new Date();
      const duration = (current as any).started_at
        ? Math.round((now.getTime() - new Date((current as any).started_at).getTime()) / 60000)
        : null;

      await supabase
        .from('queue_entries')
        .update({ status: 'completed', completed_at: now.toISOString(), duration_minutes: duration })
        .eq('id', (current as any).id);
    } else {
      notice = { error: 'No current student is in session.' };
    }
  }

  revalidatePath(`/dashboard/live/${sessionId}`);
  return redirectToLiveSession(request, sessionId, notice);
}
