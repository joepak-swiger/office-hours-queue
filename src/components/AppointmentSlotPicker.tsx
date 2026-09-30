'use client';

import { useMemo, useRef, useState } from 'react';

type AppointmentSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
};

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateKey(value: string) {
  return dateKeyFromDate(new Date(value));
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthDateFromKey(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function formatDateLabel(key: string) {
  return dateFromKey(key).toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatMonthLabel(key: string) {
  return monthDateFromKey(key).toLocaleDateString([], {
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

function addMonths(monthKey: string, amount: number) {
  const date = monthDateFromKey(monthKey);
  date.setMonth(date.getMonth() + amount);
  return monthKeyFromDate(date);
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
  const firstDateKey = dateKeys[0] ?? '';
  const lastDateKey = dateKeys[dateKeys.length - 1] ?? '';
  const firstMonthKey = firstDateKey ? monthKeyFromDate(dateFromKey(firstDateKey)) : '';
  const lastMonthKey = lastDateKey ? monthKeyFromDate(dateFromKey(lastDateKey)) : '';

  const [selectedDate, setSelectedDate] = useState(firstDateKey);
  const [visibleMonth, setVisibleMonth] = useState(firstMonthKey);
  const [selectedSlotId, setSelectedSlotId] = useState(grouped[firstDateKey]?.[0]?.id ?? '');

  const selectedSlots = selectedDate ? grouped[selectedDate] ?? [] : [];
  const timePanelRef = useRef<HTMLDivElement>(null);
  const simpleListRef = useRef<HTMLDivElement>(null);
  const availableDateSet = useMemo(() => new Set(dateKeys), [dateKeys]);

  const calendarDays = useMemo(() => {
    if (!visibleMonth) return [];

    const monthStart = monthDateFromKey(visibleMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const cursor = new Date(monthStart);
    while (cursor.getDay() !== 0) cursor.setDate(cursor.getDate() - 1);

    const last = new Date(monthEnd);
    while (last.getDay() !== 6) last.setDate(last.getDate() + 1);

    const days = [];

    while (cursor <= last) {
      const key = dateKeyFromDate(cursor);
      const isCurrentMonth = cursor.getMonth() === monthStart.getMonth();

      days.push({
        key,
        dayNumber: cursor.getDate(),
        isCurrentMonth,
        isAvailable: availableDateSet.has(key),
        count: grouped[key]?.length ?? 0
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [visibleMonth, grouped, availableDateSet]);

  function chooseDate(key: string) {
    setSelectedDate(key);
    setSelectedSlotId(grouped[key]?.[0]?.id ?? '');

    window.setTimeout(() => {
      if (window.matchMedia('(max-width: 1279px)').matches) {
        timePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  function scrollToSimpleList() {
    window.setTimeout(() => {
      simpleListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  if (slots.length === 0) return null;

  const canGoPrevious = visibleMonth > firstMonthKey;
  const canGoNext = visibleMonth < lastMonthKey;

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-medium text-ink">Choose an appointment time</legend>

      <input type="hidden" name="slotId" value={selectedSlotId} />

      <div className="mt-3 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!canGoPrevious}
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-ink disabled:opacity-30"
            >
              Prev
            </button>

            <div className="text-center">
              <p className="font-semibold text-ink">{visibleMonth ? formatMonthLabel(visibleMonth) : 'Available dates'}</p>
              <p className="text-sm text-slate-500">Pick a day with openings.</p>
            </div>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-ink disabled:opacity-30"
            >
              Next
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-1">{day}</div>
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
                    'min-h-12 rounded-xl border p-2 text-left text-xs transition',
                    day.isCurrentMonth ? 'opacity-100' : 'opacity-30',
                    day.isAvailable ? 'border-slate-200 bg-slate-50 hover:border-campus' : 'border-transparent bg-transparent text-slate-300',
                    isSelected ? 'border-campus bg-calm text-campus' : ''
                  ].join(' ')}
                >
                  <span className="block font-semibold">{day.dayNumber}</span>
                  {day.isAvailable ? <span className="mt-1 block text-[10px] text-slate-500">{day.count} open</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={timePanelRef} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-campus">Available times</p>
              <p className="mt-1 font-semibold text-ink">{selectedDate ? formatDateLabel(selectedDate) : 'Choose a day'}</p>
              <p className="text-sm text-slate-500">
                {selectedSlots.length} available {selectedSlots.length === 1 ? 'time' : 'times'}.
              </p>
            </div>
            {selectedSlotId ? <span className="rounded-full bg-calm px-3 py-1 text-xs font-semibold text-campus">Time selected</span> : null}
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto pr-2">
            <div className="grid gap-2">
              {selectedSlots.map((slot) => {
                const isSelected = slot.id === selectedSlotId;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={[
                      'rounded-xl border p-3 text-left text-sm transition',
                      isSelected ? 'border-campus bg-calm' : 'border-slate-200 bg-slate-50 hover:border-campus'
                    ].join(' ')}
                  >
                    <span className="block font-semibold text-ink">{formatTime(slot.starts_at)}</span>
                    <span className="mt-1 block text-slate-500">Ends {formatTime(slot.ends_at)}</span>
                    {slot.location ? <span className="mt-2 block text-campus">Location: {slot.location}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <details
        className="mt-4 rounded-2xl border border-slate-200 p-4"
        onToggle={(event) => {
          if (event.currentTarget.open) scrollToSimpleList();
        }}
      >
        <summary className="cursor-pointer font-semibold text-ink">Prefer a simple list?</summary>

        <div ref={simpleListRef} className="scroll-mt-6 mt-4 max-h-96 space-y-3 overflow-y-auto pr-2">
          {dateKeys.map((key, index) => (
            <details key={key} open={index === 0} className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{formatDateLabel(key)}</p>
                    <p className="text-sm text-slate-500">{grouped[key].length} openings</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-success">
                    {grouped[key].length} open
                  </span>
                </div>
              </summary>

              <div className="mt-3 flex flex-wrap gap-2">
                {grouped[key].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedDate(key);
                      setVisibleMonth(monthKeyFromDate(dateFromKey(key)));
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
            </details>
          ))}
        </div>
      </details>
    </fieldset>
  );
}
