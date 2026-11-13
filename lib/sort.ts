// Multi-column ordering for the Matches list: the first entry decides, later ones break ties.
export type SortKey = 'price' | 'deposit' | 'amenities_score';
export type Sort = { key: SortKey; dir: 1 | -1 }[]; // 1 = ascending, -1 = descending

export const sortResults = <T extends Record<string, any>>(items: T[], sort: Sort): T[] =>
  [...items].sort((a, b) => {
    for (const { key, dir } of sort) {
      const x = a[key], y = b[key];
      if (x == null || y == null) {
        if (x == null && y == null) continue;
        return x == null ? 1 : -1; // unknown values always sink to the bottom
      }
      if (x !== y) return (x - y) * dir;
    }
    return 0;
  });
