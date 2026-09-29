import { ButtonLink } from '@/components/Button';
import { Card, StatCard } from '@/components/Card';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-mist">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-campus">Office Hours Queue v0.1.0</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-6xl">One QR code for calmer office hours.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Let students book appointments, join a live walk-in queue, get status updates, and receive simple operational notifications without becoming another LMS.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/auth/login">Professor sign in</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">View demo dashboard</ButtonLink>
          </div>
        </div>
        <Card className="self-start">
          <h2 className="text-xl font-bold text-ink">Success workflow</h2>
          <ol className="mt-5 space-y-4 text-sm text-slate-700">
            <li><strong>1.</strong> Professor creates WGST 101 and office hours.</li>
            <li><strong>2.</strong> The app generates a stable QR link.</li>
            <li><strong>3.</strong> A student scans, books a slot, or joins the queue.</li>
            <li><strong>4.</strong> The professor dashboard updates during office hours.</li>
            <li><strong>5.</strong> The semester view shows visits, topics, no-shows, and wait times.</li>
          </ol>
        </Card>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:grid-cols-3 sm:px-6 lg:px-8">
        <StatCard label="Modes" value="2" helper="Scheduled appointments and live queue" />
        <StatCard label="Student accounts" value="0" helper="Secure status links for v0.1" />
        <StatCard label="Future integrations" value="Roadmap" helper="Canvas, SSO, SMS, calendars later" />
      </section>
    </main>
  );
}
