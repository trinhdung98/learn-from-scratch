import type { ColumnId, RowData } from "./types";

type SortDirection = "asc" | "desc" | null;

export interface Sort {
  columnId: ColumnId;
  direction: SortDirection;
}

type SortFn = <TData extends RowData>(
  itemA: TData,
  itemB: TData,
  sort: Sort,
  getters: Record<ColumnId, (item: TData) => unknown>
) => number;

const alphanumeric: SortFn = (itemA, itemB, sort, getters) => {
  const a = getters[sort.columnId](itemA);
  const b = getters[sort.columnId](itemB);
  return sort.direction === "asc"
    ? compareAlphanumberic(
        String(a).toLowerCase(),
        String(b).toLowerCase(),
        sort.direction
      )
    : compareAlphanumberic(
        String(b).toLowerCase(),
        String(a).toLowerCase(),
        sort.direction
      );
};

const alphanumericSensitive: SortFn = (itemA, itemB, sort, getters) => {
  const a = getters[sort.columnId](itemA);
  const b = getters[sort.columnId](itemB);
  return compareAlphanumberic(String(a), String(b), sort.direction);
};

const text: SortFn = (itemA, itemB, sort, getters) => {
  const a = getters[sort.columnId](itemA);
  const b = getters[sort.columnId](itemB);
  return compareBasic(
    String(a).toLowerCase(),
    String(b).toLowerCase(),
    sort.direction
  );
};

const textSensitive: SortFn = (itemA, itemB, sort, getters) => {
  const a = getters[sort.columnId](itemA);
  const b = getters[sort.columnId](itemB);
  return compareBasic(String(a), String(b), sort.direction);
};

const datetime: SortFn = (itemA, itemB, sort, getters) => {
  if (sort.direction === null) {
    return 0;
  }
  const a = getters[sort.columnId](itemA);
  const b = getters[sort.columnId](itemB);
  const aDate = new Date(String(a));
  const bDate = new Date(String(b));

  if (sort.direction === "asc") {
    return aDate > bDate ? 1 : aDate < bDate ? -1 : 0;
  } else {
    return aDate > bDate ? -1 : aDate < bDate ? 1 : 0;
  }
};

const compareBasic = (a: string, b: string, direction: SortDirection) => {
  if (direction === null) {
    return 0;
  }
  if (direction === "asc") {
    return a === b ? 0 : a > b ? 1 : -1;
  } else {
    return a === b ? 0 : a > b ? -1 : 1;
  }
};

const compareAlphanumberic = (
  aStr: string,
  bStr: string,
  direction: SortDirection
) => {
  if (direction === null) {
    return 0;
  }
  const a = aStr.split(/([0-9]+)/gm).filter(Boolean);
  const b = bStr.split(/([0-9]+)/gm).filter(Boolean);
  return direction === "asc"
    ? compareAlphanumericArr(a, b)
    : compareAlphanumericArr(b, a);
};

const compareAlphanumericArr = (a: string[], b: string[]) => {
  while (a.length && b.length) {
    const aa = a.shift();
    const bb = b.shift();

    if (aa && bb) {
      const aNum = parseInt(aa, 10);
      const bNum = parseInt(bb, 10);

      if (isNaN(aNum) && isNaN(bNum)) {
        if (aa > bb) {
          return 1;
        }

        if (bb > aa) {
          return -1;
        }
        continue;
      }

      if ((isNaN(aNum) && !isNaN(bNum)) || (!isNaN(aNum) && isNaN(bNum))) {
        return isNaN(aNum) ? -1 : 1;
      }

      if (aNum > bNum) {
        return 1;
      }

      if (aNum < bNum) {
        return -1;
      }
    }
  }
  return a.length - b.length;
};

export const builtInSortFns = {
  alphanumeric,
  alphanumericSensitive,
  text,
  textSensitive,
  datetime,
};

export type ColumnSortFn = keyof typeof builtInSortFns;
