import { useMemo, useReducer } from "react";

export type RowData = Record<string, unknown>;

export type ColumnId = string;

export type Accessor<TData extends RowData> =
  | ((row: TData) => unknown)
  | keyof TData;

export interface ColumnDef<TData extends RowData> {
  columnId: ColumnId;
  accessor: Accessor<TData>;
}

export interface Pagination {
  pageSize: number;
  pageIndex: number;
}

export interface Filter {
  columnId: ColumnId;
  value: string;
}

export type SortDir = "asc" | "desc" | null;

export interface Sort {
  columnId: ColumnId;
  dir: SortDir;
}

export interface TableState {
  pagination: Pagination;
  filters: Filter[];
  sorts: Sort[];
}

export interface DataTableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  initialState?: TableState;
}

type Action<_TData extends RowData> =
  | {
      type: "SET_PAGINATION";
      payload: { pagination: Pagination };
    }
  | { type: "SET_FILTER"; payload: { filter: Filter } };

const reducer = <TData extends RowData>(
  state: TableState,
  action: Action<TData>
): TableState => {
  switch (action.type) {
    case "SET_PAGINATION": {
      const { pagination } = action.payload;
      return { ...state, pagination };
    }
    case "SET_FILTER": {
      const { filter } = action.payload;
      const newFilters = state.filters.filter(
        (f) => f.columnId !== filter.value
      );
      return { ...state, filters: [...newFilters, filter] };
    }
    default: {
      return { ...state };
    }
  }
};

const getValue = <TData extends RowData>(
  row: TData,
  accessor: Accessor<TData>
) => {
  return typeof accessor === "function" ? accessor(row) : row[accessor];
};

const createInitialState = (overrides?: Partial<TableState>): TableState => {
  return {
    filters: [],
    sorts: [],
    pagination: {
      pageSize: 10,
      pageIndex: 0,
    },
    ...overrides,
  };
};

const applyFilter = <TData extends RowData>(
  rows: TData[],
  filters: Filter[],
  getters: Record<string, (row: TData) => unknown>
): TData[] => {
  if (filters.length === 0) {
    return rows;
  }
  const filteredRows = rows.filter((row) => {
    return filters.every((filter) => {
      const rowValue = getters[filter.columnId]?.(row);
      const rowValueStr = rowValue ? String(rowValue) : "";
      return rowValueStr.toLowerCase().includes(filter.value.toLowerCase());
    });
  });
  return filteredRows;
};

const applyPagination = <TData extends RowData>(
  rows: TData[],
  pagination: Pagination
) => {
  const { pageIndex, pageSize } = pagination;
  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  return rows.slice(startIndex, endIndex);
};

const useTable = <TData extends RowData>({
  data,
  columns,
  initialState,
}: DataTableProps<TData>) => {
  const [state, dispatch] = useReducer(
    reducer<TData>,
    createInitialState(initialState)
  );

  const getters = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => [
        column.columnId,
        (row: TData) => getValue(row, column.accessor),
      ])
    );
  }, [columns]);

  const filteredRows = useMemo(() => {
    return applyFilter(data, state.filters, getters);
  }, [data, getters, state.filters]);

  const paginationRows = useMemo(() => {
    return applyPagination(filteredRows, state.pagination);
  }, [filteredRows, state.pagination]);

  const onNextPage = () => {
    const newPagination: Pagination = {
      ...state.pagination,
      pageIndex: state.pagination.pageIndex + 1,
    };
    dispatch({
      type: "SET_PAGINATION",
      payload: {
        pagination: newPagination,
      },
    });
  };

  const onPreviousPage = () => {};

  const onFirstPage = () => {};

  const onLastPage = () => {};

  const getCanNextPage = () => {};

  const getCanPreviousPage = () => {};

  return {
    state: paginationRows,
    pagedRows: data,

    // pagination action
    onNextPage,
    onPreviousPage,
    onFirstPage,
    onLastPage,
    getCanNextPage,
    getCanPreviousPage,
    // filter action
  };
};

const DataTable = <TData extends RowData>(props: DataTableProps<TData>) => {
  const table = useTable(props);
  return <table></table>;
};

export default DataTable;
