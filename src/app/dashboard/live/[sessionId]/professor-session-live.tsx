'use client';

import { useEffect, useState } from 'react';

export function ProfessorSessionLive({ sessionId, initialCount }: { sessionId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/professor/sessions/${sessionId}/stream`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (typeof data.activeCount === 'number') setCount(data.activeCount);
    };
    return () => source.close();
  }, [sessionId]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft" aria-live="polite">
      Live dashboard updates: {connected ? 'connected' : 'reconnecting'} · {count} active student{count === 1 ? '' : 's'}
    </div>
  );
}
