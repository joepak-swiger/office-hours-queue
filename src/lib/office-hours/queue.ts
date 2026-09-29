import { QueueState, isTerminalQueueState } from './states';

export type QueueEntryForOrdering = {
  id: string;
  position: number;
  createdAt: string | Date;
  status: QueueState;
};

export type QueuePosition = {
  id: string;
  position: number;
  peopleAhead: number;
};

export function activeQueueStates(): QueueState[] {
  return ['waiting', 'next', 'ready', 'checked_in', 'late'];
}

export function normalizeQueuePositions(entries: QueueEntryForOrdering[]): QueuePosition[] {
  const active = entries
    .filter((entry) => !isTerminalQueueState(entry.status) && entry.status !== 'in_session')
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  return active.map((entry, index) => ({
    id: entry.id,
    position: index + 1,
    peopleAhead: index
  }));
}

export function nextPosition(entries: QueueEntryForOrdering[]): number {
  const positions = entries
    .filter((entry) => !isTerminalQueueState(entry.status))
    .map((entry) => entry.position);
  return positions.length === 0 ? 1 : Math.max(...positions) + 1;
}

export function moveDown(entries: QueueEntryForOrdering[], entryId: string): QueuePosition[] {
  const normalized = normalizeQueuePositions(entries);
  const index = normalized.findIndex((entry) => entry.id === entryId);
  if (index === -1 || index === normalized.length - 1) return normalized;

  const reordered = [...normalized];
  const [entry] = reordered.splice(index, 1);
  reordered.splice(index + 1, 0, entry);

  return reordered.map((entry, nextIndex) => ({
    id: entry.id,
    position: nextIndex + 1,
    peopleAhead: nextIndex
  }));
}
