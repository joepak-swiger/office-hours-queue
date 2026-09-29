export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-mist px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">{children}</div>
    </main>
  );
}
