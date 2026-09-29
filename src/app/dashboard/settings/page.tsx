import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';

export default function SettingsPage() {
  return (
    <AppShell>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Settings</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Professor settings</h1>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">v0.1 defaults</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>Default appointment duration: course-level setting</li>
            <li>Late threshold: 5 minutes by default</li>
            <li>No-show threshold: 10 minutes by default</li>
            <li>Student authentication: secure unguessable status tokens</li>
            <li>Email provider: console locally, Resend for real transactional email</li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-ink">Privacy posture</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">This v0.1 collects only operational office-hours information and avoids grades, medical details, disability information, and continuous location tracking. It is FERPA-aware by design, but it is not represented as FERPA-certified.</p>
        </Card>
      </div>
    </AppShell>
  );
}
