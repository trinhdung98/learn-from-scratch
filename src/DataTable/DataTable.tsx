import { useMemo, useReducer, type ReactNode } from "react";

export type RowData = Record<string, unknown>;

export type ColumnId = string;

export type Accessor<TData extends RowData> =
  | ((row: TData) => unknown)
  | keyof TData;

export interface ColumnDef<TData extends RowData> {
  columnId: ColumnId;
  accessor: Accessor<TData>;
  header: ReactNode;
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

  const onPreviousPage = () => {
    const newPagination: Pagination = {
      ...state.pagination,
      pageIndex: state.pagination.pageIndex - 1,
    };
    dispatch({
      type: "SET_PAGINATION",
      payload: {
        pagination: newPagination,
      },
    });
  };

  const onFirstPage = () => {
    const newPagination: Pagination = {
      ...state.pagination,
      pageIndex: 0,
    };
    dispatch({
      type: "SET_PAGINATION",
      payload: {
        pagination: newPagination,
      },
    });
  };

  const onLastPage = () => {
    const totalItems = filteredRows.length;
    const lastPage =
      totalItems % state.pagination.pageSize === 0
        ? Math.floor(totalItems / state.pagination.pageSize) - 1
        : Math.floor(totalItems / state.pagination.pageSize);
    const newPagination: Pagination = {
      ...state.pagination,
      pageIndex: lastPage,
    };
    dispatch({
      type: "SET_PAGINATION",
      payload: {
        pagination: newPagination,
      },
    });
  };

  const onRowPerPage = (pageSize: number) => {
    const newPagination: Pagination = {
      ...state.pagination,
      pageSize,
      pageIndex: 0,
    };
    dispatch({
      type: "SET_PAGINATION",
      payload: {
        pagination: newPagination,
      },
    });
  };

  const getCanNextPage = () => {
    const totalItems = filteredRows.length;
    const lastPage =
      totalItems % state.pagination.pageSize === 0
        ? Math.floor(totalItems / state.pagination.pageSize) - 1
        : Math.floor(totalItems / state.pagination.pageSize);
    return state.pagination.pageIndex !== lastPage;
  };

  const getCanPreviousPage = () => {
    return state.pagination.pageIndex !== 0;
  };

  return {
    state: state,
    rows: paginationRows,
    columns: columns,
    getters,
    totalItems: filteredRows.length,

    // pagination action
    onNextPage,
    onPreviousPage,
    onFirstPage,
    onLastPage,
    getCanNextPage,
    getCanPreviousPage,
    onRowPerPage,
    // filter action
  };
};

const DataTable = <TData extends RowData>(props: DataTableProps<TData>) => {
  const {
    state,
    rows,
    columns,
    getters,
    onFirstPage,
    onLastPage,
    onNextPage,
    onPreviousPage,
    getCanNextPage,
    getCanPreviousPage,
    onRowPerPage,
    totalItems,
  } = useTable(props);
  return (
    <div className="flex flex-col justify-center p-10">
      <table className="border border-gray-500">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.columnId} className="border border-gray-500 p-2">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            return (
              <tr key={index} className="border border-gray-500">
                {columns.map((column) => {
                  return (
                    <td
                      key={column.columnId}
                      className="border border-gray-500 p-2"
                    >
                      {getters[column.columnId](row) as ReactNode}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex mt-4 gap-4">
        <button
          onClick={onFirstPage}
          className="border border-gray-500 cursor-pointer p-2 rounded-md disabled:opacity-50"
        >
          First page
        </button>
        <button
          onClick={onPreviousPage}
          className="border border-gray-500 cursor-pointer p-2 rounded-md disabled:opacity-50"
          disabled={!getCanPreviousPage()}
        >
          Previous page
        </button>
        <button
          onClick={onNextPage}
          className="border border-gray-500 cursor-pointer p-2 rounded-md disabled:opacity-50"
          disabled={!getCanNextPage()}
        >
          Next page
        </button>
        <button
          onClick={onLastPage}
          className="border border-gray-500 cursor-pointer p-2 rounded-md disabled:opacity-50"
        >
          Last page
        </button>
        <div className="flex items-center">
          <span>Row per page: </span>
          <select
            onChange={(e) => {
              onRowPerPage(parseInt(e.target.value));
            }}
            className="border border-gray-500"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div className="flex items-center">
          <span>Page: {state.pagination.pageIndex + 1}</span>
        </div>
        <div className="flex items-center">
          <span>Total items: {totalItems} rows</span>
        </div>
      </div>
    </div>
  );
};

type Person = {
  id: number;
  name: string;
  age: number;
  city: string;
  title: string;
};

const columns: ColumnDef<Person>[] = [
  {
    columnId: "name",
    accessor: "name",
    header: "Name",
  },
  {
    columnId: "age",
    accessor: "age",
    header: "Age",
  },
  {
    columnId: "city",
    accessor: (row) => row.city,
    header: "City",
  },
  {
    columnId: "title",
    accessor: "title",
    header: "Title",
  },
];
const data: Person[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  age: 18 + ((i * 7) % 50),
  city: ["Tokyo", "NYC", "Paris", "Hanoi"][i % 4],
  title: ["Engineer", "Designer", "PM", "Analyst"][i % 4],
}));

export const DataTableDemo = () => {
  return <DataTable data={data} columns={columns} />;
};

export default DataTable;
