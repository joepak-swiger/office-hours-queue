export function StudentIntakeFields({ categories, courseId }: { categories: { id: string; label: string }[]; courseId: string }) {
  return (
    <>
      <input type="hidden" name="courseId" value={courseId} />
      <label className="block text-sm font-medium text-ink">
        Full name <span className="text-danger" aria-hidden="true">*</span>
        <input required name="fullName" autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
      </label>
      <label className="block text-sm font-medium text-ink">
        Email address <span className="text-danger" aria-hidden="true">*</span>
        <input required type="email" name="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
      </label>
      <label className="block text-sm font-medium text-ink">
        Course section, if applicable
        <input name="courseSection" placeholder="001" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
      </label>
      <label className="block text-sm font-medium text-ink">
        Reason or topic <span className="text-danger" aria-hidden="true">*</span>
        <select required name="topicCategoryId" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
          <option value="">Choose a topic</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-ink sm:col-span-2">
        Short description, optional
        <textarea name="topicDescription" rows={4} maxLength={600} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
        <span className="mt-2 block text-xs leading-5 text-slate-500">Please avoid including highly sensitive personal or medical information here. You can discuss those details privately with your instructor.</span>
      </label>
      <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2">
        <input type="checkbox" name="notificationConsent" value="true" defaultChecked className="mt-1" />
        Send me office-hours emails for confirmations, reminders, and status changes.
      </label>
    </>
  );
}
