'use client';

import { useEffect, useState } from 'react';

export function FloatingNotice({
  success,
  error,
  durationMs = 4500
}: {
  success?: string;
  error?: string;
  durationMs?: number;
}) {
  const message = success || error || '';
  const kind = error ? 'error' : 'success';
  const [visible, setVisible] = useState(Boolean(message));

  function clearNoticeFromUrl() {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('error');

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }

  function dismiss() {
    setVisible(false);
    clearNoticeFromUrl();
  }

  useEffect(() => {
    if (!message) return;

    setVisible(true);

    const timer = window.setTimeout(() => {
      dismiss();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [message, durationMs]);

  if (!message || !visible) return null;

  const styles = kind === 'error'
    ? 'border-red-200 bg-red-50 text-danger'
    : 'border-emerald-200 bg-emerald-50 text-success';

  return (
    <div className="fixed left-1/2 top-20 z-50 w-[min(92vw,720px)] -translate-x-1/2">
      <div className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm font-semibold shadow-xl ${styles}`}>
        <span>{message}</span>
        <button type="button" onClick={dismiss} className="shrink-0 text-xs font-bold">
          Dismiss
        </button>
      </div>
    </div>
  );
}
