import { notFound } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PublicShell } from '@/components/PublicShell';
import { StudentIntakeFields } from '@/components/StudentIntakeFields';
import { getActiveSession, getPublicCourse } from '@/lib/data';

export default async function QueuePage({
  params,
  searchParams
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const query = searchParams ? await searchParams : {};
  const course = await getPublicCourse(courseId);
  if (!course) notFound();
  const session = await getActiveSession(course.id);
  const categories = (course.topic_categories ?? []).map((c: any) => ({ id: c.id, label: c.label }));

  return (
    <PublicShell>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Join today's queue</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{course.code}</h1>
        <p className="mt-2 text-slate-600">Students in the queue cannot see each other's names, topics, or personal information.</p>
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-danger">{query.error}</p> : null}
        {!session ? <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-warning">There is no active live queue right now.</p> : null}
        {session ? (
          <form method="post" action="/api/queue/join" className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="sessionId" value={session.id} />
            <StudentIntakeFields categories={categories} courseId={course.id} />
            <div className="sm:col-span-2"><Button type="submit">Join queue</Button></div>
          </form>
        ) : null}
      </Card>
    </PublicShell>
  );
}
