'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth/login?error=${encodeURIComponent('Could not sign in. Check the email and password.')}`);
  redirect('/dashboard');
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/dashboard` }
  });

  if (error) redirect(`/auth/login?error=${encodeURIComponent('Could not send a magic link.')}`);
  redirect(`/auth/login?message=${encodeURIComponent('Check your email for a sign-in link.')}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
