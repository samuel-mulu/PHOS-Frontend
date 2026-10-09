/** Newest waiting first; urgent/emergency still stay above routine when priority is present. */
export function sortQueueNewestFirst<
  T extends { enteredAt: string; priority?: string },
>(items: T[]): T[] {
  const priorityRank = (p?: string) => {
    if (p === "EMERGENCY") return 3;
    if (p === "URGENT") return 2;
    return 1;
  };
  return [...items].sort((a, b) => {
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    return new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime();
  });
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
