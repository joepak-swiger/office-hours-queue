import { AppShell } from '@/components/AppShell';
import { ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function CoursesPage() {
  const { user } = await requireProfessor();
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase.from('courses').select('id, code, title, section, public_slug, terms(name)').eq('professor_id', user.id).is('archived_at', null).order('code');

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-campus">Courses</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Course office-hour pages</h1>
        </div>
        <ButtonLink href="/dashboard/courses/new">New course</ButtonLink>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {(courses ?? []).map((course: any) => (
          <Card key={course.id}>
            <p className="text-sm text-slate-500">{course.terms?.name}</p>
            <h2 className="mt-1 text-xl font-bold text-ink">{course.code}{course.section ? ` · ${course.section}` : ''}</h2>
            <p className="mt-1 text-slate-600">{course.title}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={`/dashboard/courses/${course.id}`}>Manage</ButtonLink>
              <ButtonLink href={`/c/${course.public_slug}`} variant="secondary">Open student page</ButtonLink>
            </div>
          </Card>
        ))}
        {(courses ?? []).length === 0 ? <Card><p className="text-slate-600">No courses yet. Create one to generate a QR code.</p></Card> : null}
      </div>
    </AppShell>
  );
}
