import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { customProfessorMessageTemplate } from '@/lib/notifications/templates';
import { sendNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const body = await request.json().catch(() => ({}));
  const to = String(body.to ?? user.email ?? '');
  if (!to) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });
  const result = await sendNotification(customProfessorMessageTemplate({ to, message: 'This is a test notification from Office Hours Queue.' }));
  return NextResponse.json(result);
}
