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
  array.reduce((groups, item) => {
    const group = predicate(item);
    groups[group] ??= [];
    groups[group].push(item);
    return groups;
  }, {} as Partial<Record<K, T[]>>);

export const getCombinations = <T>(array: T[]) => {
  const combinations = [[]] as T[][];

  for (const item of array) {
    const combinationsNumber = combinations.length;

    for (let index = 0; index < combinationsNumber; index++) {
      combinations.push([...combinations[index]!, item]);
    }
  }

  combinations.reverse();
  combinations.sort((itemA, itemB) => itemB.length - itemA.length);
  combinations.pop();

  return combinations;
};

export const swap = <T>(array: T[], indexA: number, indexB: number) =>
  ([array[indexA], array[indexB]] = [array[indexB]!, array[indexA]!]);
