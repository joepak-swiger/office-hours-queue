import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { signInWithPassword, sendMagicLink } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Professor access</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Use Supabase Auth. For local demos, run <code className="rounded bg-slate-100 px-1">npm run db:seed</code> after configuring your environment.</p>

        {params.error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-danger" role="alert">{params.error}</div> : null}
        {params.message ? <div className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-success" role="status">{params.message}</div> : null}

        <form action={signInWithPassword} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Email
            <input required type="email" name="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-campus focus:outline-none" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Password
            <input required type="password" name="password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-campus focus:outline-none" />
          </label>
          <Button className="w-full" type="submit">Sign in</Button>
        </form>

        <form action={sendMagicLink} className="mt-4 border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-ink">
            Or send a magic link
            <input required type="email" name="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-campus focus:outline-none" />
          </label>
          <Button className="mt-3 w-full" variant="secondary" type="submit">Email me a sign-in link</Button>
        </form>
      </Card>
    </main>
  );
}
