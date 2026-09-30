'use client';

import { useMemo, useState } from 'react';

type AppointmentSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
};

function dateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString([], {
    month: 'long',
    year: 'numeric'
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function AppointmentSlotPicker({ slots }: { slots: AppointmentSlot[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, AppointmentSlot[]> = {};

    for (const slot of slots) {
      const key = dateKey(slot.starts_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(slot);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }

    return groups;
  }, [slots]);

  const dateKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);
  const [selectedDate, setSelectedDate] = useState(dateKeys[0] ?? '');
  const [selectedSlotId, setSelectedSlotId] = useState(grouped[dateKeys[0] ?? '']?.[0]?.id ?? '');

  const selectedSlots = selectedDate ? grouped[selectedDate] ?? [] : [];
  const availableDateSet = new Set(dateKeys);

  const calendarDays = useMemo(() => {
    if (dateKeys.length === 0) return [];

    const firstAvailableDate = new Date(dateKeys[0] + 'T00:00:00');
    const lastAvailableDate = new Date(dateKeys[dateKeys.length - 1] + 'T00:00:00');

    const start = new Date(firstAvailableDate.getFullYear(), firstAvailableDate.getMonth(), 1);
    const end = new Date(lastAvailableDate.getFullYear(), lastAvailableDate.getMonth() + 1, 0);

    const days = [];
    const cursor = new Date(start);

    while (cursor.getDay() !== 0) {
      cursor.setDate(cursor.getDate() - 1);
    }

    const last = new Date(end);
    while (last.getDay() !== 6) {
      last.setDate(last.getDate() + 1);
    }

    while (cursor <= last) {
      const key = dateKey(cursor.toISOString());
      days.push({
        key,
        dayNumber: cursor.getDate(),
        inMainRange: cursor >= start && cursor <= end,
        isAvailable: availableDateSet.has(key),
        count: grouped[key]?.length ?? 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [dateKeys, grouped, availableDateSet]);

  function chooseDate(key: string) {
    setSelectedDate(key);
    setSelectedSlotId(grouped[key]?.[0]?.id ?? '');
  }

  if (slots.length === 0) {
    return null;
  }

  const monthLabel = dateKeys.length > 0 ? formatMonthLabel(dateKeys[0]) : 'Available dates';

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-medium text-ink">Choose an appointment time</legend>

      <input type="hidden" name="slotId" value={selectedSlotId} />

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{monthLabel}</p>
              <p className="text-sm text-slate-500">Pick a day with openings.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-success">
              {dateKeys.length} days
            </span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const isSelected = day.key === selectedDate;

              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={!day.isAvailable}
                  onClick={() => chooseDate(day.key)}
                  className={[
                    'min-h-16 rounded-xl border p-2 text-left text-sm transition',
                    day.inMainRange ? 'opacity-100' : 'opacity-40',
                    day.isAvailable ? 'border-slate-200 bg-slate-50 hover:border-campus' : 'border-transparent bg-transparent text-slate-300',
                    isSelected ? 'border-campus bg-calm text-campus' : ''
                  ].join(' ')}
                >
                  <span className="block font-semibold">{day.dayNumber}</span>
                  {day.isAvailable ? (
                    <span className="mt-1 block text-[11px] text-slate-500">{day.count} open</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <p className="font-semibold text-ink">{selectedDate ? formatDateLabel(selectedDate) : 'Choose a day'}</p>
            <p className="text-sm text-slate-500">
              {selectedSlots.length} available {selectedSlots.length === 1 ? 'time' : 'times'}.
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            {selectedSlots.map((slot) => {
              const isSelected = slot.id === selectedSlotId;

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={[
                    'rounded-xl border p-4 text-left text-sm transition',
                    isSelected ? 'border-campus bg-calm' : 'border-slate-200 bg-slate-50 hover:border-campus'
                  ].join(' ')}
                >
                  <span className="block font-semibold text-ink">{formatTime(slot.starts_at)}</span>
                  <span className="mt-1 block text-slate-500">Ends {formatTime(slot.ends_at)}</span>
                  {slot.location ? <span className="mt-2 block text-campus">Location: {slot.location}</span> : null}
                  {isSelected ? <span className="mt-2 block font-semibold text-campus">Selected</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold text-ink">Prefer a simple list?</summary>
        <div className="mt-4 space-y-3">
          {dateKeys.map((key) => (
            <div key={key}>
              <p className="font-semibold text-ink">{formatDateLabel(key)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {grouped[key].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedDate(key);
                      setSelectedSlotId(slot.id);
                    }}
                    className={[
                      'rounded-full border px-3 py-2 text-sm font-medium transition',
                      selectedSlotId === slot.id ? 'border-campus bg-calm text-campus' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-campus'
                    ].join(' ')}
                  >
                    {formatTime(slot.starts_at)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </fieldset>
  );
}
