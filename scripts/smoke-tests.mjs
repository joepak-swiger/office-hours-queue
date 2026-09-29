import test from 'node:test';
import assert from 'node:assert/strict';

function normalizeQueuePositions(entries) {
  const terminal = new Set(['completed', 'cancelled', 'left_queue', 'no_show']);
  return entries
    .filter((entry) => !terminal.has(entry.status) && entry.status !== 'in_session')
    .sort((a, b) => a.position - b.position || new Date(a.createdAt) - new Date(b.createdAt))
    .map((entry, index) => ({ id: entry.id, position: index + 1, peopleAhead: index }));
}

function estimateWaitMinutes(peopleAhead, averageMinutes, delay = 0) {
  return Math.max(0, peopleAhead * averageMinutes + delay);
}

function appointmentLateDecision(startsAt, now, lateThresholdMinutes, noShowThresholdMinutes) {
  const elapsed = Math.floor((new Date(now) - new Date(startsAt)) / 60000);
  if (elapsed >= noShowThresholdMinutes) return 'no_show';
  if (elapsed >= lateThresholdMinutes) return 'late';
  return 'on_time';
}

test('queue positions hide terminal states', () => {
  const result = normalizeQueuePositions([
    { id: 'a', position: 2, status: 'waiting', createdAt: '2026-09-29T14:02:00Z' },
    { id: 'b', position: 1, status: 'waiting', createdAt: '2026-09-29T14:01:00Z' },
    { id: 'c', position: 3, status: 'completed', createdAt: '2026-09-29T14:03:00Z' }
  ]);
  assert.deepEqual(result, [
    { id: 'b', position: 1, peopleAhead: 0 },
    { id: 'a', position: 2, peopleAhead: 1 }
  ]);
});

test('wait estimate is approximate and explainable', () => {
  assert.equal(estimateWaitMinutes(2, 11, 0), 22);
  assert.equal(estimateWaitMinutes(1, 12, 10), 22);
});

test('late/no-show thresholds are deterministic', () => {
  assert.equal(appointmentLateDecision('2026-09-29T14:00:00Z', '2026-09-29T14:04:00Z', 5, 10), 'on_time');
  assert.equal(appointmentLateDecision('2026-09-29T14:00:00Z', '2026-09-29T14:06:00Z', 5, 10), 'late');
  assert.equal(appointmentLateDecision('2026-09-29T14:00:00Z', '2026-09-29T14:10:00Z', 5, 10), 'no_show');
});
