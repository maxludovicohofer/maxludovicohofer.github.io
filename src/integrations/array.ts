export const partition = <T>(
  array: T[],
  filter: (element: T) => any
): [filtered: typeof array, filteredOut: typeof array] => {
  const filtered: typeof array = [];
  const filteredOut: typeof array = [];

  array.forEach((e) => (filter(e) ? filtered : filteredOut).push(e));

  return [filtered, filteredOut];
};

export const groupBy = <T, K extends string>(
  array: T[],
  predicate: (item: T) => K
) =>
  array.reduce(
    (groups, item) => {
      const group = predicate(item);
      groups[group] ??= [];
      groups[group].push(item);
      return groups;
    },
    {} as Partial<Record<K, T[]>>
  );
