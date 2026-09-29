import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-bold text-ink">Office Hours Queue</Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-slate-600" aria-label="Main navigation">
            <Link href="/dashboard/courses" className="hover:text-campus">Courses</Link>
            <Link href="/dashboard/analytics" className="hover:text-campus">Analytics</Link>
            <Link href="/dashboard/settings" className="hover:text-campus">Settings</Link>
            {data.user ? <span className="hidden rounded-full bg-calm px-3 py-1 text-campus sm:inline">Signed in</span> : <Link href="/auth/login" className="hover:text-campus">Sign in</Link>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
