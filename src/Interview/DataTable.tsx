import { useState, type ReactNode } from "react";

const TABLE_WIDTH = 800;

type ColumnId = string;

interface Filter {
  columnId: ColumnId;
  value: string;
}

type SortDirection = "asc" | "desc" | null;

interface Sort {
  columnId: ColumnId;
  direction: SortDirection;
}

interface Pagination {
  pageIndex: number;
  pageSize: number;
}

interface TableState {
  filters: Filter[];
  sorts: Sort[];
  pagination: Pagination;
  globalFilter: string;
}

type Accessor<T> = keyof T | ((item: T) => unknown);

interface Column<T> {
  columnId: ColumnId;
  header: ReactNode;
  accessor: Accessor<T>;
  cell: (item: T) => ReactNode;
}

const defaultPagination: Pagination = {
  pageIndex: 0,
  pageSize: 10,
};

const defaultState: TableState = {
  filters: [],
  sorts: [],
  pagination: defaultPagination,
  globalFilter: "",
};

const applyFilters = <T,>(
  items: T[],
  filters: Filter[],
  getter: Record<string, (item: T) => unknown>
): T[] => {
  if (filters.length === 0) {
    return items;
  }
  const filteredItems = items.filter((item) => {
    return filters.every((filter) => {
      return String(getter[filter.columnId](item))
        .toLowerCase()
        .includes(filter.value.toLowerCase());
    });
  });
  return filteredItems;
};

const applySorts = <T,>(
  items: T[],
  sorts: Sort[],
  getter: Record<string, (item: T) => unknown>
): T[] => {
  if (sorts.length === 0) {
    return items;
  }
  const sortedItems = items.sort((itemA, itemB) => {
    const sort = sorts[0];
    const valueA = String(getter[sort.columnId](itemA));
    const valueB = String(getter[sort.columnId](itemB));
    if (valueA === valueB) {
      return 0;
    }
    if (sort.direction === "asc") {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA > valueB ? -1 : 1;
    }
  });
  return sortedItems;
};

const applyPagination = <T,>(items: T[], pagination: Pagination): T[] => {
  const offset = pagination.pageIndex * pagination.pageSize;
  const newItems = items.slice(offset, offset + pagination.pageSize);
  return newItems;
};

const getCellValue = <T,>(item: T, accessor: Accessor<T>) => {
  return typeof accessor === "function" ? accessor(item) : item[accessor];
};

interface DaTaTableProps<T, K extends keyof T> {
  items: T[];
  columns: Column<T>[];
  rowKey: K;
  state?: TableState;
  onFilter?: (filter: Filter) => void;
  onSort?: (sort: Sort) => void;
}

const DataTable = <T, K extends keyof T>({
  items,
  columns,
  rowKey,
  state = defaultState,
  onFilter,
  onSort,
}: DaTaTableProps<T, K>) => {
  const [tableState, setTableState] = useState(state);
  const { filters, sorts, pagination } = tableState;
  console.log("tableState", tableState);

  const filterById = Object.fromEntries(
    filters.map((filter) => [filter.columnId, filter.value])
  );

  const getter = Object.fromEntries(
    columns.map((column) => [
      column.columnId,
      (item: T) => getCellValue(item, column.accessor),
    ])
  );

  const onColumnFilter = (filter: Filter) => {
    setTableState((previous) => {
      const newFilters = previous.filters.filter(
        (item) => item.columnId !== filter.columnId
      );
      return {
        ...previous,
        filters: [filter, ...newFilters],
      };
    });
    onFilter?.(filter);
  };

  const onColumnSort = (sort: Sort) => {
    setTableState((previous) => {
      const foundSort = previous.sorts.find(
        (item) => item.columnId === sort.columnId
      );
      const filteredOutSort = previous.sorts.filter(
        (item) => item.columnId !== sort.columnId
      );
      if (foundSort) {
        const newSort = { ...foundSort };
        if (foundSort.direction === "asc") {
          newSort.direction = "desc";
        } else {
          newSort.direction = "asc";
        }

        return {
          ...previous,
          sorts: [newSort, ...filteredOutSort],
        };
      } else {
        return {
          ...previous,
          sorts: [
            { columnId: sort.columnId, direction: "asc" },
            ...filteredOutSort,
          ],
        };
      }
    });
    onSort?.(sort);
  };

  const canPreviousPage = () => {
    return pagination.pageIndex !== 0;
  };

  const onPreviousPage = () => {
    if (!canPreviousPage()) {
      return;
    }
    const newPagination: Pagination = {
      ...pagination,
      pageIndex: pagination.pageIndex - 1,
    };
    setTableState((previous) => {
      return {
        ...previous,
        pagination: newPagination,
      };
    });
  };

  const onFirstPage = () => {
    const newPagination: Pagination = {
      ...pagination,
      pageIndex: 0,
    };
    setTableState((previous) => {
      return {
        ...previous,
        pagination: newPagination,
      };
    });
  };

  const canNextPage = () => {
    const lastPageIndex =
      Math.ceil(sortedItems.length / pagination.pageSize) - 1;
    return pagination.pageIndex !== lastPageIndex;
  };

  const onNextPage = () => {
    if (!canNextPage()) {
      return;
    }
    const newPagination: Pagination = {
      ...pagination,
      pageIndex: pagination.pageIndex + 1,
    };
    setTableState((previous) => {
      return {
        ...previous,
        pagination: newPagination,
      };
    });
  };

  const onLastPage = () => {
    const lastPageIndex =
      Math.ceil(sortedItems.length / pagination.pageSize) - 1;
    const newPagination: Pagination = {
      ...pagination,
      pageIndex: lastPageIndex,
    };
    setTableState((previous) => {
      return {
        ...previous,
        pagination: newPagination,
      };
    });
  };

  const onRowPerPage = (pageSize: number) => {
    const newPagination: Pagination = {
      pageIndex: 0,
      pageSize: pageSize,
    };
    setTableState((previous) => {
      return {
        ...previous,
        pagination: newPagination,
      };
    });
  };

  const filteredItems = applyFilters(items, filters, getter);
  const sortedItems = applySorts(filteredItems, sorts, getter);
  const paginatedItems = applyPagination(sortedItems, pagination);

  return (
    <>
      <table className={`border border-gray-500 min-w-[${TABLE_WIDTH}px]`}>
        <thead>
          <tr>
            {columns.map((column) => {
              return (
                <th
                  key={column.columnId}
                  className="border border-gray-500 p-1"
                >
                  <div>
                    <button
                      onClick={() =>
                        onColumnSort({
                          columnId: column.columnId,
                          direction: "asc",
                        })
                      }
                    >
                      {column.header}
                    </button>
                  </div>
                  <input
                    name={column.columnId}
                    id={column.columnId}
                    className="border border-gray-500 font-normal"
                    value={filterById[column.columnId]}
                    onChange={(e) =>
                      onColumnFilter({
                        columnId: column.columnId,
                        value: e.target.value,
                      })
                    }
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((item) => {
            return (
              <tr key={item[rowKey] as string}>
                {columns.map((column) => (
                  <td
                    key={column.columnId}
                    className="border border-gray-500 p-1"
                  >
                    {column.cell(item)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={`flex justify-between items-center mt-2`}>
        <div className="flex gap-2">
          <button
            className="border border-b-gray-500 px-2 py-1 rounded-md cursor-pointer disabled:opacity-50"
            onClick={onFirstPage}
          >
            First
          </button>
          <button
            className="border border-b-gray-500 px-2 py-1 rounded-md cursor-pointer disabled:opacity-50"
            onClick={onPreviousPage}
            disabled={!canPreviousPage()}
          >
            Previous
          </button>
          <button
            className="border border-b-gray-500 px-2 py-1 rounded-md cursor-pointer disabled:opacity-50"
            onClick={onNextPage}
            disabled={!canNextPage()}
          >
            Next
          </button>
          <button
            className="border border-b-gray-500 px-2 py-1 rounded-md cursor-pointer disabled:opacity-50"
            onClick={onLastPage}
          >
            Last
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <div>
            <span>Total: {sortedItems.length}</span>
          </div>
          <div>
            <span>Page: {tableState.pagination.pageIndex + 1}</span>
          </div>
          <select
            className="border border-b-gray-500 p-1 cursor-pointer"
            onChange={(e) => onRowPerPage(parseInt(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};

interface Person {
  personId: string;
  name: string;
  birthday: string;
  address: string;
}

const persons: Person[] = [...Array(100).keys()].map((idx) => ({
  personId: String(idx + 1),
  name: `Name ${idx + 1}`,
  address: `Address ${idx + 1}`,
  birthday: `Birthday ${idx + 1}`,
}));

const columns: Column<Person>[] = [
  {
    columnId: "name",
    header: "Name",
    accessor: "name",
    cell: (item) => item.name,
  },
  {
    columnId: "address",
    header: "Address",
    accessor: (item) => item.address,
    cell: (item) => item.address,
  },
  {
    columnId: "birthday",
    header: "Birthday",
    accessor: "birthday",
    cell: (item) => item.birthday,
  },
];

const DataTableDemo = () => {
  const [tableState, setTableState] = useState(defaultState);

  const onFilter = (filter: Filter) => {
    setTableState((previous) => {
      const newFilters = previous.filters.filter(
        (item) => item.columnId !== filter.columnId
      );
      return {
        ...previous,
        filters: [filter, ...newFilters],
      };
    });
  };

  const onSort = (sort: Sort) => {
    setTableState((previous) => {
      const foundSort = previous.sorts.find(
        (item) => item.columnId === sort.columnId
      );
      const filteredOutSort = previous.sorts.filter(
        (item) => item.columnId !== sort.columnId
      );
      if (foundSort) {
        if (foundSort.direction === "asc") {
          foundSort.direction = "desc";
        } else {
          foundSort.direction = "asc";
        }

        return {
          ...previous,
          sorts: [foundSort, ...filteredOutSort],
        };
      } else {
        return {
          ...previous,
          sorts: [
            { columnId: sort.columnId, direction: "asc" },
            ...filteredOutSort,
          ],
        };
      }
    });
  };

  const onGlobalFilter = (value: string) => {
    setTableState((previous) => {
      return {
        ...previous,
        globalFilter: value,
      };
    });
  };

  return (
    <div className="flex py-5 justify-center h-[100vh] gap-2 overflow-auto">
      <div className={`w-[${TABLE_WIDTH}px]`}>
        <div className="mb-2">
          <span>Filter: </span>
          <input
            className="border border-gray-500 font-normal"
            value={tableState.globalFilter}
            onChange={(e) => onGlobalFilter(e.target.value)}
          />
        </div>
        <DataTable
          items={persons}
          rowKey={"personId"}
          columns={columns}
          state={tableState}
          onFilter={onFilter}
          onSort={onSort}
        />
      </div>
    </div>
  );
};

export default DataTableDemo;
