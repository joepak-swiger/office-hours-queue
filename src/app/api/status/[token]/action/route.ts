import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { statusActionSchema } from '@/lib/validation';
import { asFriendlyMessage, FriendlyError } from '@/lib/errors';

const terminalQueueStatuses = new Set(['completed', 'cancelled', 'left_queue', 'no_show']);
const terminalAppointmentStatuses = new Set(['completed', 'cancelled_by_student', 'cancelled_by_instructor', 'no_show']);

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const formData = await request.formData();
    const { action, topicDescription } = statusActionSchema.parse(Object.fromEntries(formData.entries()));
    const supabase = createSupabaseServiceClient();

    const { data: queueEntry } = await supabase
      .from('queue_entries')
      .select('id, status')
      .eq('status_token', token)
      .maybeSingle();

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('status_token', token)
      .maybeSingle();

    if (queueEntry) {
      if (terminalQueueStatuses.has(queueEntry.status)) {
        throw new FriendlyError('This queue link is closed because you are no longer in the active queue.');
      }

      const update: Record<string, unknown> = {};

      if (action === 'on_my_way') {
        update.on_my_way_at = new Date().toISOString();
      }

      if (action === 'checked_in') {
        update.status = 'checked_in';
        update.checked_in_at = new Date().toISOString();
      }

      if (action === 'leave_queue') {
        update.status = 'left_queue';
      }

      if (action === 'update_topic') {
        update.topic_description = topicDescription ?? '';
      }

      if (Object.keys(update).length === 0) {
        throw new FriendlyError('That action is not available for this queue status.');
      }

      const { error } = await supabase.from('queue_entries').update(update).eq('id', queueEntry.id);
      if (error) throw error;
    } else if (appointment) {
      if (terminalAppointmentStatuses.has(appointment.status)) {
        throw new FriendlyError('This appointment link is closed because the appointment is no longer active.');
      }

      const update: Record<string, unknown> = {};

      if (action === 'checked_in') {
        update.status = 'checked_in';
        update.checked_in_at = new Date().toISOString();
      }

      if (action === 'cancel_appointment') {
        update.status = 'cancelled_by_student';
      }

      if (action === 'update_topic') {
        update.topic_description = topicDescription ?? '';
      }

      if (Object.keys(update).length === 0) {
        throw new FriendlyError('That action is not available for this appointment status.');
      }

      const { error } = await supabase.from('appointments').update(update).eq('id', appointment.id);
      if (error) throw error;

      if (action === 'cancel_appointment') {
        const { data: appt } = await supabase.from('appointments').select('slot_id').eq('id', appointment.id).single();
        if (appt?.slot_id) await supabase.from('appointment_slots').update({ status: 'available' }).eq('id', appt.slot_id);
      }
    } else {
      throw new FriendlyError('This status link could not be found.');
    }

    return NextResponse.redirect(new URL(`/status/${token}`, request.url), { status: 303 });
  } catch (error) {
    const url = new URL(`/status/${token}`, request.url);
    url.searchParams.set('error', asFriendlyMessage(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}
