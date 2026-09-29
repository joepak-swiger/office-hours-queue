import { notFound } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PublicShell } from '@/components/PublicShell';
import { getPublicCourse } from '@/lib/data';

export default async function NotifyOpeningsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await getPublicCourse(courseId);
  if (!course) notFound();

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Opening alerts</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Notify me when a slot opens</h1>
        <p className="mt-2 text-slate-600">Subscribe for openings in {course.code}. You can narrow this later in the roadmap by day or date range.</p>
        <form method="post" action="/api/openings/subscribe" className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="courseId" value={course.id} />
          <label className="block text-sm font-medium text-ink">Full name<input required name="fullName" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
          <label className="block text-sm font-medium text-ink">Email<input required name="email" type="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
          <label className="block text-sm font-medium text-ink">Preferred day, optional
            <select name="dayPreference" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="">Any day</option>
              <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">Need it by, optional<input name="dateRangeEnd" type="date" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
          <div className="sm:col-span-2"><Button type="submit">Subscribe to openings</Button></div>
        </form>
      </Card>
    </PublicShell>
  );
}
