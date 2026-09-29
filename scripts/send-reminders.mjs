import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());
import { Resend } from 'resend';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const now = new Date();
const inOneHour = new Date(now.getTime() + 60 * 60000);
const { data: appointments, error } = await supabase
  .from('appointments')
  .select('id,status,status_token,students(email),appointment_slots(starts_at),courses(code)')
  .eq('status', 'scheduled')
  .gte('appointment_slots.starts_at', now.toISOString())
  .lte('appointment_slots.starts_at', inOneHour.toISOString());
if (error) throw error;

const provider = process.env.NOTIFICATION_PROVIDER ?? 'console';
for (const appt of appointments ?? []) {
  const email = appt.students?.email;
  if (!email) continue;
  const text = `Reminder: your office-hour appointment for ${appt.courses?.code ?? 'your course'} is coming up. Status link: ${(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')}/status/${appt.status_token}`;
  if (provider === 'resend') {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: process.env.NOTIFICATION_FROM_EMAIL, to: email, subject: 'Office-hour appointment reminder', text });
  } else {
    console.log('[reminder]', email, text);
  }
}
console.log(`Processed ${appointments?.length ?? 0} reminder candidates.`);
