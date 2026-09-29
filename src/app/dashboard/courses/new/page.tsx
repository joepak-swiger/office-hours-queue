import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { requireProfessor } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createCourse, createTerm } from '../actions';

export default async function NewCoursePage() {
  const { user } = await requireProfessor();
  const supabase = await createSupabaseServerClient();
  const { data: terms } = await supabase.from('terms').select('id, name, academic_year').eq('professor_id', user.id).is('archived_at', null).order('name');

  return (
    <AppShell>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-campus">Setup</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Create a course</h1>
        <p className="mt-2 text-slate-600">Start with a term, then create the course that students will see from the QR code.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-xl font-bold text-ink">Add term</h2>
          <form action={createTerm} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-ink">Term name<input name="name" required placeholder="Fall 2026" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium text-ink">Academic year<input name="academicYear" placeholder="2026–27" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <Button type="submit">Save term</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">Course details</h2>
          <form action={createCourse} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink sm:col-span-2">Term
              <select name="termId" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="">Choose a term</option>
                {(terms ?? []).map((term: any) => <option key={term.id} value={term.id}>{term.name}{term.academic_year ? ` (${term.academic_year})` : ''}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink">Course code<input name="code" required placeholder="WGST 101" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium text-ink">Section<input name="section" placeholder="001" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium text-ink sm:col-span-2">Course title<input name="title" required placeholder="Introduction to Women's and Gender Studies" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium text-ink">Office location<input name="officeLocation" placeholder="Room 214" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium text-ink">Virtual meeting URL<input name="virtualMeetingUrl" type="url" placeholder="https://..." className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium text-ink">Default appointment minutes<input name="defaultAppointmentMinutes" type="number" defaultValue={20} min={5} max={180} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
            <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <legend className="px-1 text-sm font-semibold text-ink">Enabled modes</legend>
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="appointmentsEnabled" defaultChecked value="true" /> Scheduled appointments</label>
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="walkInsEnabled" defaultChecked value="true" /> Live walk-in queue</label>
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="openingAlertsEnabled" defaultChecked value="true" /> Opening alerts</label>
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="waitlistEnabled" defaultChecked value="true" /> Basic waitlist</label>
            </fieldset>
            <div className="sm:col-span-2"><Button type="submit">Create course</Button></div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
