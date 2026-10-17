/** Latest = newest first (default). Oldest = longest waiting / earliest date on top. */
export type DateSortDirection = "latest" | "oldest";

const DATE_SORT_STORAGE_KEY = "phos.queueDateSort";

export function readStoredDateSort(
  fallback: DateSortDirection = "latest",
): DateSortDirection {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(DATE_SORT_STORAGE_KEY);
    if (v === "latest" || v === "oldest") return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function storeDateSort(direction: DateSortDirection) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DATE_SORT_STORAGE_KEY, direction);
  } catch {
    /* ignore */
  }
}

export function compareDates(
  aIso: string,
  bIso: string,
  direction: DateSortDirection,
): number {
  const diff = new Date(aIso).getTime() - new Date(bIso).getTime();
  return direction === "latest" ? -diff : diff;
}

export function sortByDateField<T>(
  items: T[],
  getDate: (item: T) => string,
  direction: DateSortDirection = "latest",
): T[] {
  return [...items].sort((a, b) =>
    compareDates(getDate(a), getDate(b), direction),
  );
}

/** Newest first (legacy helper). */
export function sortByCreatedAtDesc<T extends { createdAt: string }>(
  items: T[],
): T[] {
  return sortByDateField(items, (i) => i.createdAt, "latest");
}

export function sortByCreatedAt<T extends { createdAt: string }>(
  items: T[],
  direction: DateSortDirection = "latest",
): T[] {
  return sortByDateField(items, (i) => i.createdAt, direction);
}

/** Latest arrival first (cashier: newest payment request on top). */
export function sortByEnteredAtDesc<T extends { enteredAt: string }>(
  items: T[],
): T[] {
  return sortByDateField(items, (i) => i.enteredAt, "latest");
}

export function sortByEnteredAt<T extends { enteredAt: string }>(
  items: T[],
  direction: DateSortDirection = "latest",
): T[] {
  return sortByDateField(items, (i) => i.enteredAt, direction);
}

/**
 * Queue waiting list: urgent/emergency stay above routine, then by enteredAt.
 * Default direction = latest (newest waiting first).
 */
export function sortQueueByWaiting<
  T extends { enteredAt: string; priority?: string },
>(items: T[], direction: DateSortDirection = "latest"): T[] {
  const priorityRank = (p?: string) => {
    if (p === "EMERGENCY") return 3;
    if (p === "URGENT") return 2;
    return 1;
  };
  return [...items].sort((a, b) => {
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    return compareDates(a.enteredAt, b.enteredAt, direction);
  });
}

/** @deprecated Prefer sortQueueByWaiting(items, "latest") */
export function sortQueueNewestFirst<
  T extends { enteredAt: string; priority?: string },
>(items: T[]): T[] {
  return sortQueueByWaiting(items, "latest");
}
