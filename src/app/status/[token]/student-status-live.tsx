'use client';

import { useEffect, useState } from 'react';

export function StudentStatusLive({ token, initialStatus }: { token: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [connected, setConnected] = useState(false);
  const [canNotify, setCanNotify] = useState(false);

  useEffect(() => {
    setCanNotify(typeof window !== 'undefined' && 'Notification' in window);
  }, []);

  useEffect(() => {
    const source = new EventSource(`/api/status/${token}/stream`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const next = JSON.parse(event.data);

      if (next.status) {
        setStatus(String(next.status));

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Office Hours Queue update', {
            body: `Your status is now: ${String(next.status).replaceAll('_', ' ')}`
          });
        }
      }
    };

    return () => source.close();
  }, [token]);

  async function enableBrowserNotifications() {
    if ('Notification' in window) await Notification.requestPermission();
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
      <p aria-live="polite">
        Live updates: {connected ? 'connected' : 'reconnecting'} · Current status:{' '}
        <strong>{status.replaceAll('_', ' ')}</strong>
      </p>
      {canNotify ? (
        <button type="button" onClick={enableBrowserNotifications} className="mt-2 font-semibold text-campus">
          Enable browser notifications
        </button>
      ) : null}
    </div>
  );
}
