import type { ColumnId, RowData } from "./types";

export interface Filter {
  columnId: ColumnId;
  value: unknown;
}

export type FilterFn = <TData extends RowData>(
  item: TData,
  filter: Filter,
  getters: Record<ColumnId, (item: TData) => unknown>
) => boolean;

const includesString: FilterFn = (item, filter, getters) =>
  String(getters[filter.columnId](item))
    .toLowerCase()
    .includes(String(filter.value).toLowerCase());

const includesStringSensitive: FilterFn = (item, filter, getters) =>
  String(getters[filter.columnId](item)).includes(String(filter.value));

const equalsString: FilterFn = (item, filter, getters) =>
  String(getters[filter.columnId](item)).toLowerCase() ===
  String(filter.value).toLowerCase();

const equalsStringSensitive: FilterFn = (item, filter, getters) =>
  String(getters[filter.columnId](item)).toLowerCase() ===
  String(filter.value).toLowerCase();

export const builtInFilterFns = {
  includesString,
  includesStringSensitive,
  equalsString,
  equalsStringSensitive,
};

export type ColumnFilterFn = keyof typeof builtInFilterFns;
