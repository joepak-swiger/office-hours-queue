import { describe, expect, it } from 'vitest';
import { moveDown, nextPosition, normalizeQueuePositions } from '@/lib/office-hours/queue';

describe('queue ordering', () => {
  const entries = [
    { id: 'b', position: 2, status: 'waiting' as const, createdAt: '2026-09-29T14:05:00Z' },
    { id: 'a', position: 1, status: 'waiting' as const, createdAt: '2026-09-29T14:00:00Z' },
    { id: 'done', position: 3, status: 'completed' as const, createdAt: '2026-09-29T14:01:00Z' }
  ];

  it('normalizes active positions and hides terminal states', () => {
    expect(normalizeQueuePositions(entries)).toEqual([
      { id: 'a', position: 1, peopleAhead: 0 },
      { id: 'b', position: 2, peopleAhead: 1 }
    ]);
  });

  it('calculates the next position after active entries', () => {
    expect(nextPosition(entries)).toBe(3);
  });

  it('can move someone down without losing the order', () => {
    expect(moveDown(entries, 'a')).toEqual([
      { id: 'b', position: 1, peopleAhead: 0 },
      { id: 'a', position: 2, peopleAhead: 1 }
    ]);
  });
});
