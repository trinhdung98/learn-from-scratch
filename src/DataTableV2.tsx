import React, { useMemo, useState } from "react";

/**
 * Generic, type‑safe data table
 * - Global keyword filter (case-insensitive)
 * - Clickable headers to sort (tri-state: none → asc → desc → none)
 * - Renders dynamic data via column definitions
 * - Client-side pagination
 * - Fully typed with TypeScript generics
 */

// Primitive values we know how to sort natively
export type SortablePrimitive =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type Column<T> = {
  /** Unique id for the column (used for sorting state) */
  id: string;
  /** Header text or React node */
  header: React.ReactNode;
  /** Return the raw value for this cell (used for sorting & default rendering) */
  accessor: (row: T) => SortablePrimitive | React.ReactNode;
  /** Optional custom cell render. Gets the accessor value and the whole row. */
  cell?: (value: ReturnType<Column<T>["accessor"]>, row: T) => React.ReactNode;
  /** Whether header is clickable to sort. Defaults to true. */
  sortable?: boolean;
  /**
   * Optional function to produce a keyword-searchable string for this column.
   * By default we'll use the accessor value stringified.
   */
  toFilterText?: (row: T) => string;
  /** Optional column width class (Tailwind or your own). */
  className?: string;
};

export type SortState = {
  columnId: string | null;
  direction: "asc" | "desc" | null; // null means unsorted
};

export type Pagination = {
  page: number; // 0-based
  pageSize: number;
};

export type DataTableProps<T> = {
  data: readonly T[];
  columns: readonly Column<T>[];
  initialSort?: SortState;
  initialPageSize?: number;
  /** Optional controlled keyword filter */
  keyword?: string;
  /** Optional callback if you want to control keyword from parent */
  onKeywordChange?: (k: string) => void;
  /** Optional aria-label for the table */
  ariaLabel?: string;
  /** Optional className to style the table container */
  className?: string;
};

function isPrimitiveForSort(
  v: unknown
): v is Exclude<SortablePrimitive, React.ReactNode> {
  return (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    v instanceof Date ||
    v === null ||
    v === undefined
  );
}

function comparePrimitive(a: SortablePrimitive, b: SortablePrimitive): number {
  // Normalize nullish to smallest
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  // Dates
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  // booleans as 0/1
  if (typeof a === "boolean" && typeof b === "boolean")
    return Number(a) - Number(b);
  // number vs number
  if (typeof a === "number" && typeof b === "number") return a - b;
  // everything else as string
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function DataTable<T extends object>(props: DataTableProps<T>) {
  const {
    data,
    columns,
    initialSort = { columnId: null, direction: null },
    initialPageSize = 10,
    keyword: controlledKeyword,
    onKeywordChange,
    ariaLabel = "Data table",
    className,
  } = props;

  const [sort, setSort] = useState<SortState>(initialSort);
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    pageSize: initialPageSize,
  });
  const [uncontrolledKeyword, setUncontrolledKeyword] = useState("");
  const keyword = controlledKeyword ?? uncontrolledKeyword;

  // Cycle tri-state sort on column header click
  function toggleSort(columnId: string, sortable = true) {
    if (!sortable) return;
    setPagination((p) => ({ ...p, page: 0 }));
    setSort((prev) => {
      if (prev.columnId !== columnId) return { columnId, direction: "asc" };
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      if (prev.direction === "desc") return { columnId: null, direction: null };
      return { columnId, direction: "asc" };
    });
  }

  const normalizedFilter = (keyword ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedFilter) return data;
    return data.filter((row) => {
      // Join all columns' filter text
      const haystack = columns
        .map((col) =>
          col.toFilterText
            ? col.toFilterText(row)
            : String(col.accessor(row) ?? "")
        )
        .join("\u2003") // thin separator
        .toLowerCase();
      return haystack.includes(normalizedFilter);
    });
  }, [normalizedFilter, data, columns]);

  const sorted = useMemo(() => {
    if (!sort.columnId || !sort.direction) return filtered;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col) return filtered;

    // Stable sort with index tiebreaker
    return filtered
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => {
        const va = col.accessor(a.row);
        const vb = col.accessor(b.row);
        // If non-primitive (ReactNode etc.), fall back to string
        const pa = isPrimitiveForSort(va)
          ? (va as SortablePrimitive)
          : String(va);
        const pb = isPrimitiveForSort(vb)
          ? (vb as SortablePrimitive)
          : String(vb);
        const cmp = comparePrimitive(pa, pb);
        const dir = sort.direction === "asc" ? 1 : -1;
        return cmp !== 0 ? dir * cmp : a.idx - b.idx;
      })
      .map(({ row }) => row);
  }, [filtered, columns, sort]);

  const { page, pageSize } = pagination;
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = page * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const paged = sorted.slice(pageStart, pageEnd);

  function goToPage(p: number) {
    setPagination((s) => ({
      ...s,
      page: Math.min(Math.max(0, p), totalPages - 1),
    }));
  }

  return (
    <div className={"w-full max-w-full " + (className ?? "")}>
      {/* Filter + Page size controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <label className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-gray-600">Filter</span>
          <input
            aria-label="Filter keyword"
            className="input input-bordered border rounded px-3 py-2 text-sm w-full sm:w-64"
            placeholder="Type to filter…"
            value={keyword}
            onChange={(e) =>
              onKeywordChange
                ? onKeywordChange(e.target.value)
                : setUncontrolledKeyword(e.target.value)
            }
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows</span>
          <select
            aria-label="Rows per page"
            className="border rounded px-2 py-2 text-sm"
            value={pageSize}
            onChange={(e) =>
              setPagination({ page: 0, pageSize: Number(e.target.value) })
            }
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm" aria-label={ariaLabel}>
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => {
                const isActive = sort.columnId === col.id && sort.direction;
                const sortable = col.sortable !== false; // default true
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={`px-3 py-2 font-medium text-left whitespace-nowrap ${
                      col.className ?? ""
                    }`}
                  >
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 select-none ${
                        sortable ? "cursor-pointer" : "cursor-default"
                      }`}
                      onClick={() => toggleSort(col.id, sortable)}
                      aria-sort={
                        isActive
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      title={sortable ? "Click to sort" : undefined}
                    >
                      <span>{col.header}</span>
                      {sortable && (
                        <span aria-hidden className="text-xs opacity-70">
                          {isActive
                            ? sort.direction === "asc"
                              ? "▲"
                              : "▼"
                            : "↕"}
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-gray-500 px-3 py-6"
                >
                  No data
                </td>
              </tr>
            ) : (
              paged.map((row, rIdx) => (
                <tr
                  key={pageStart + rIdx}
                  className={rIdx % 2 ? "bg-white" : "bg-gray-50/40"}
                >
                  {columns.map((col) => {
                    const value = col.accessor(row);
                    return (
                      <td
                        key={col.id}
                        className={`px-3 py-2 align-top ${col.className ?? ""}`}
                      >
                        {col.cell
                          ? col.cell(value, row)
                          : typeof value === "object" &&
                            !isPrimitiveForSort(value)
                          ? value
                          : String(value ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
        <div className="text-xs text-gray-600">
          Showing <strong>{total === 0 ? 0 : pageStart + 1}</strong>–
          <strong>{pageEnd}</strong> of <strong>{total}</strong>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="border rounded px-2 py-1 text-sm disabled:opacity-40"
            onClick={() => goToPage(0)}
            disabled={page === 0}
          >
            « First
          </button>
          <button
            className="border rounded px-2 py-1 text-sm disabled:opacity-40"
            onClick={() => goToPage(page - 1)}
            disabled={page === 0}
          >
            ‹ Prev
          </button>
          <span className="text-sm">
            Page <strong>{page + 1}</strong> / {totalPages}
          </span>
          <button
            className="border rounded px-2 py-1 text-sm disabled:opacity-40"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next ›
          </button>
          <button
            className="border rounded px-2 py-1 text-sm disabled:opacity-40"
            onClick={() => goToPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
          >
            Last »
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * --- Demo below ---
 * You can keep this file as-is and import <DataTable/> elsewhere, or use the demo component directly.
 */

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
  joinedAt: Date;
};

const sampleUsers: User[] = [
  {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    age: 28,
    isActive: true,
    joinedAt: new Date("2024-03-02"),
  },
  {
    id: 2,
    name: "Bob",
    email: "bob@example.com",
    age: 34,
    isActive: false,
    joinedAt: new Date("2023-11-18"),
  },
  {
    id: 3,
    name: "Carlos",
    email: "carlos@example.com",
    age: 41,
    isActive: true,
    joinedAt: new Date("2022-08-01"),
  },
  {
    id: 4,
    name: "Diana",
    email: "diana@example.com",
    age: 24,
    isActive: true,
    joinedAt: new Date("2024-07-22"),
  },
  {
    id: 5,
    name: "Eve",
    email: "eve@example.com",
    age: 31,
    isActive: false,
    joinedAt: new Date("2021-12-30"),
  },
  {
    id: 6,
    name: "Frank",
    email: "frank@example.com",
    age: 29,
    isActive: true,
    joinedAt: new Date("2022-02-14"),
  },
  {
    id: 7,
    name: "Grace",
    email: "grace@example.com",
    age: 26,
    isActive: false,
    joinedAt: new Date("2024-05-05"),
  },
  {
    id: 8,
    name: "Heidi",
    email: "heidi@example.com",
    age: 36,
    isActive: true,
    joinedAt: new Date("2020-10-10"),
  },
  {
    id: 9,
    name: "Ivan",
    email: "ivan@example.com",
    age: 33,
    isActive: true,
    joinedAt: new Date("2023-02-02"),
  },
  {
    id: 10,
    name: "Judy",
    email: "judy@example.com",
    age: 27,
    isActive: false,
    joinedAt: new Date("2024-01-09"),
  },
  {
    id: 11,
    name: "Ken",
    email: "ken@example.com",
    age: 45,
    isActive: true,
    joinedAt: new Date("2019-04-19"),
  },
  {
    id: 12,
    name: "Lena",
    email: "lena@example.com",
    age: 30,
    isActive: true,
    joinedAt: new Date("2021-06-07"),
  },
];

const userColumns: Column<User>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (u) => u.name,
  },
  {
    id: "email",
    header: "Email",
    accessor: (u) => u.email,
    className: "min-w-[16rem]",
  },
  {
    id: "age",
    header: "Age",
    accessor: (u) => u.age,
    className: "w-20 text-right",
    cell: (v) => (
      <span className="tabular-nums float-right">{v as number}</span>
    ),
  },
  {
    id: "status",
    header: "Active",
    accessor: (u) => u.isActive,
    cell: (v) => (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          v ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
        }`}
      >
        {v ? "Yes" : "No"}
      </span>
    ),
  },
  {
    id: "joined",
    header: "Joined",
    accessor: (u) => u.joinedAt,
    className: "min-w-[8.5rem]",
    cell: (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)),
  },
];

export default function DataTableDemo() {
  const [kw, setKw] = useState("");

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">
        Generic, Type‑Safe React Table
      </h1>
      <p className="text-gray-600 mb-4">
        Filter, sort (tri‑state), and paginate — powered by TypeScript generics.
        No external table libraries.
      </p>

      <DataTable<User>
        data={sampleUsers}
        columns={userColumns}
        initialPageSize={5}
        keyword={kw}
        onKeywordChange={setKw}
        ariaLabel="Users table"
      />

      <div className="mt-6 text-xs text-gray-500">
        Tip: Click a header repeatedly to toggle ascending → descending →
        unsorted.
      </div>
    </div>
  );
}
