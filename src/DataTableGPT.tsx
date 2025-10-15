import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
// --- Optional external deps you should install in your app ---
// npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tanstack/react-virtual
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";

// =====================
// Types
// =====================
export type RowData = Record<string, unknown>;
export type Accessor<T extends RowData> = ((row: T) => unknown) | keyof T;

export type ColumnDef<T extends RowData> = {
  id: string; // unique, stable
  header: string;
  accessor: Accessor<T>;
  width?: number; // px
  minWidth?: number;
  maxWidth?: number;
  enableSort?: boolean;
  enableFilter?: boolean;
  enableResize?: boolean;
  enablePin?: boolean;
  cell?: (ctx: { row: T }) => React.ReactNode;
  headerCell?: () => React.ReactNode;
};

export type SortDir = "asc" | "desc";
export type Sort = { columnId: string; dir: SortDir };

export type Filter = {
  columnId: string;
  value: string; // default: text contains
};

export type PinSide = "left" | "right" | null; // null => center

export type PaginationState = { pageIndex: number; pageSize: number };

export type TableState = {
  sortBy: Sort[];
  filters: Filter[];
  columnOrder: string[]; // center columns visual order
  columnPin: Record<string, PinSide>;
  columnWidths: Record<string, number>; // px
  pagination: PaginationState;
  scrollLeft: number;
  scrollTop: number;
  columnVisibility: Record<string, boolean>; // NEW
};

export type TableProps<T extends RowData> = {
  data: T[];
  columns: ColumnDef<T>[];
  initialState?: Partial<TableState>;
  rowKey?: (row: T, index: number) => string;
  serverMode?: boolean; // if true, parent applies sort/filter/pagination
  onStateChange?: (s: TableState) => void;
  height?: number; // viewport height in px
  width?: number; // table width in px
  overscan?: number;
  rowHeight?: number; // fixed for simplicity
};

// =====================
// Utils
// =====================
function getValue<T extends RowData>(row: T, acc: Accessor<T>) {
  return typeof acc === "function" ? acc(row) : (row[acc] as unknown);
}

function clamp(n: number, min?: number, max?: number) {
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

function stableMultiSort<T>(
  rows: T[],
  sorts: Sort[],
  getters: Record<string, (r: T) => unknown>
) {
  if (!sorts.length) return rows;
  const withIndex = rows.map((r, i) => ({ r, i }));
  withIndex.sort((a, b) => {
    for (const s of sorts) {
      const ga = getters[s.columnId]?.(a.r);
      const gb = getters[s.columnId]?.(b.r);
      const va = ga as any;
      const vb = gb as any;
      if (va == null && vb == null) continue;
      if (va == null) return s.dir === "asc" ? -1 : 1;
      if (vb == null) return s.dir === "asc" ? 1 : -1;
      if (va < vb) return s.dir === "asc" ? -1 : 1;
      if (va > vb) return s.dir === "asc" ? 1 : -1;
    }
    return a.i - b.i;
  });
  return withIndex.map((x) => x.r);
}

function applyFilters<T extends RowData>(
  rows: T[],
  filters: Filter[],
  getters: Record<string, (r: T) => unknown>
) {
  if (!filters.length) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const v = getters[f.columnId]?.(row);
      const str = v == null ? "" : String(v).toLowerCase();
      return str.includes(f.value.toLowerCase());
    })
  );
}

// =====================
// Reducer & state
// =====================
const DEFAULT_ROW_H = 36;

function createInitialState<T extends RowData>(
  columns: ColumnDef<T>[],
  overrides?: Partial<TableState>
): TableState {
  const columnOrder = columns
    .filter((c) => !c.id.startsWith("__pin"))
    .map((c) => c.id);
  const columnPin: Record<string, PinSide> = Object.fromEntries(
    columns.map((c) => [c.id, null])
  );
  const columnWidths: Record<string, number> = Object.fromEntries(
    columns.map((c) => [c.id, c.width ?? 160])
  );
  const columnVisibility: Record<string, boolean> = Object.fromEntries(
    columns.map((c) => [c.id, true])
  );
  return {
    sortBy: [],
    filters: [],
    columnOrder,
    columnPin,
    columnWidths,
    pagination: { pageIndex: 0, pageSize: 25 },
    scrollLeft: 0,
    scrollTop: 0,
    columnVisibility,
    ...overrides,
  };
}

type Action<T extends RowData> =
  | { type: "SET_SORT"; payload: Sort[] }
  | { type: "TOGGLE_SORT"; columnId: string; multi: boolean }
  | { type: "SET_FILTER"; filter: Filter }
  | { type: "CLEAR_FILTER"; columnId: string }
  | { type: "REORDER_CENTER"; sourceIndex: number; destIndex: number }
  | { type: "PIN_COLUMN"; columnId: string; side: PinSide }
  | { type: "RESIZE_COLUMN"; columnId: string; width: number }
  | { type: "SET_PAGINATION"; payload: PaginationState }
  | { type: "SET_SCROLL"; left: number; top: number }
  // NEW visibility actions
  | { type: "TOGGLE_COLUMN_VISIBILITY"; columnId: string; visible: boolean }
  | { type: "SET_ALL_COLUMNS_VISIBILITY"; visible: boolean };

function reducer<T extends RowData>(
  state: TableState,
  action: Action<T>
): TableState {
  switch (action.type) {
    case "SET_SORT":
      return { ...state, sortBy: action.payload };
    case "TOGGLE_SORT": {
      const { columnId, multi } = action;
      const existing = state.sortBy.find((s) => s.columnId === columnId);
      let next: Sort[];
      if (!multi) {
        if (!existing) next = [{ columnId, dir: "asc" }];
        else if (existing.dir === "asc") next = [{ columnId, dir: "desc" }];
        else next = [];
      } else {
        next = state.sortBy.filter((s) => s.columnId !== columnId);
        if (!existing) next.push({ columnId, dir: "asc" });
        else if (existing.dir === "asc") next.push({ columnId, dir: "desc" });
      }
      return { ...state, sortBy: next };
    }
    case "SET_FILTER": {
      const others = state.filters.filter(
        (f) => f.columnId !== action.filter.columnId
      );
      return { ...state, filters: [...others, action.filter] };
    }
    case "CLEAR_FILTER": {
      return {
        ...state,
        filters: state.filters.filter((f) => f.columnId !== action.columnId),
      };
    }
    case "REORDER_CENTER": {
      const arr = [...state.columnOrder];
      const [moved] = arr.splice(action.sourceIndex, 1);
      arr.splice(action.destIndex, 0, moved);
      return { ...state, columnOrder: arr };
    }
    case "PIN_COLUMN": {
      const pin = { ...state.columnPin, [action.columnId]: action.side };
      return { ...state, columnPin: pin };
    }
    case "RESIZE_COLUMN": {
      return {
        ...state,
        columnWidths: {
          ...state.columnWidths,
          [action.columnId]: action.width,
        },
      };
    }
    case "SET_PAGINATION":
      return { ...state, pagination: action.payload };
    case "SET_SCROLL":
      return { ...state, scrollLeft: action.left, scrollTop: action.top };

    // NEW: visibility
    case "TOGGLE_COLUMN_VISIBILITY": {
      return {
        ...state,
        columnVisibility: {
          ...state.columnVisibility,
          [action.columnId]: action.visible,
        },
      };
    }
    case "SET_ALL_COLUMNS_VISIBILITY": {
      const next = Object.fromEntries(
        Object.keys(state.columnVisibility).map((k) => [k, action.visible])
      );
      return { ...state, columnVisibility: next };
    }

    default:
      return state;
  }
}

// =====================
// Hook: useTable
// =====================
export function useTable<T extends RowData>(props: TableProps<T>) {
  const {
    data,
    columns,
    initialState,
    rowKey = (_row: T, i: number) => String(i),
    onStateChange,
    height = 480,
    width = 900,
    overscan = 6,
    rowHeight = DEFAULT_ROW_H,
  } = props;

  const [state, dispatch] = useReducer(
    reducer<T>,
    createInitialState(columns, initialState)
  );
  useEffect(() => void onStateChange?.(state), [state, onStateChange]);

  // Column getters for sorting/filtering
  const getters = useMemo(
    () =>
      Object.fromEntries(
        columns.map((c) => [c.id, (r: T) => getValue(r, c.accessor)])
      ),
    [columns]
  );

  // Split columns into regions (left, center, right) respecting visibility
  const leftPinned = useMemo(
    () =>
      columns.filter(
        (c) => state.columnVisibility[c.id] && state.columnPin[c.id] === "left"
      ),
    [columns, state.columnPin, state.columnVisibility]
  );
  const rightPinned = useMemo(
    () =>
      columns.filter(
        (c) => state.columnVisibility[c.id] && state.columnPin[c.id] === "right"
      ),
    [columns, state.columnPin, state.columnVisibility]
  );
  const centerAll = useMemo(
    () =>
      columns.filter(
        (c) => state.columnVisibility[c.id] && state.columnPin[c.id] === null
      ),
    [columns, state.columnPin, state.columnVisibility]
  );

  // Center visual order according to columnOrder
  const centerById: Record<string, ColumnDef<T>> = useMemo(
    () => Object.fromEntries(centerAll.map((c) => [c.id, c])),
    [centerAll]
  );
  const centerOrdered = useMemo(
    () => state.columnOrder.map((id) => centerById[id]).filter(Boolean),
    [state.columnOrder, centerById]
  );

  // Filtering -> Sorting -> Pagination pipeline (client-side)
  const filtered = useMemo(
    () => applyFilters(data, state.filters, getters),
    [data, state.filters, getters]
  );
  const sorted = useMemo(
    () => stableMultiSort(filtered, state.sortBy, getters),
    [filtered, state.sortBy, getters]
  );
  const paged = useMemo(() => {
    const { pageIndex, pageSize } = state.pagination;
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, state.pagination]);

  // Virtualization: rows (on current page)
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const rowVirtual = useVirtualizer({
    count: paged.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // Virtualization: columns for center region only
  const centerWidths = useMemo(
    () => centerOrdered.map((c) => state.columnWidths[c.id] ?? c.width ?? 160),
    [centerOrdered, state.columnWidths]
  );
  const centerColVirtual = useVirtualizer({
    horizontal: true,
    count: centerOrdered.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: (i) => centerWidths[i] ?? 160,
    overscan,
  });

  // Sticky offset calculators for pinned sides
  const leftOffsets = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (const c of leftPinned) {
      arr.push(acc);
      acc += state.columnWidths[c.id] ?? c.width ?? 160;
    }
    return arr;
  }, [leftPinned, state.columnWidths]);
  const rightOffsets = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (let i = rightPinned.length - 1; i >= 0; i--) {
      arr.unshift(acc);
      acc +=
        state.columnWidths[rightPinned[i].id] ?? rightPinned[i].width ?? 160;
    }
    return arr;
  }, [rightPinned, state.columnWidths]);

  const totalCenterWidth = useMemo(
    () => centerWidths.reduce((a, b) => a + b, 0),
    [centerWidths]
  );
  const totalLeftWidth = useMemo(
    () =>
      leftPinned.reduce(
        (a, c) => a + (state.columnWidths[c.id] ?? c.width ?? 160),
        0
      ),
    [leftPinned, state.columnWidths]
  );
  const totalRightWidth = useMemo(
    () =>
      rightPinned.reduce(
        (a, c) => a + (state.columnWidths[c.id] ?? c.width ?? 160),
        0
      ),
    [rightPinned, state.columnWidths]
  );

  // Event handlers
  const toggleSort = useCallback(
    (columnId: string, multi: boolean) =>
      dispatch({ type: "TOGGLE_SORT", columnId, multi }),
    []
  );
  const setFilter = useCallback(
    (columnId: string, value: string) =>
      dispatch({ type: "SET_FILTER", filter: { columnId, value } }),
    []
  );
  const clearFilter = useCallback(
    (columnId: string) => dispatch({ type: "CLEAR_FILTER", columnId }),
    []
  );
  const pinColumn = useCallback(
    (columnId: string, side: PinSide) =>
      dispatch({ type: "PIN_COLUMN", columnId, side }),
    []
  );
  const resizeColumn = useCallback(
    (columnId: string, width: number, def?: ColumnDef<T>) => {
      const w = clamp(width, def?.minWidth, def?.maxWidth);
      dispatch({ type: "RESIZE_COLUMN", columnId, width: w });
    },
    []
  );
  const reorderCenter = useCallback(
    (sourceIndex: number, destIndex: number) =>
      dispatch({ type: "REORDER_CENTER", sourceIndex, destIndex }),
    []
  );
  const setPagination = useCallback(
    (p: PaginationState) => dispatch({ type: "SET_PAGINATION", payload: p }),
    []
  );

  // NEW: visibility helpers
  const toggleColumnVisibility = useCallback(
    (columnId: string, visible: boolean) =>
      dispatch({ type: "TOGGLE_COLUMN_VISIBILITY", columnId, visible }),
    []
  );
  const setAllColumnsVisibility = useCallback(
    (visible: boolean) =>
      dispatch({ type: "SET_ALL_COLUMNS_VISIBILITY", visible }),
    []
  );

  return {
    // state & sizing
    state,
    height,
    width,

    // columns
    leftPinned,
    centerOrdered,
    rightPinned,
    leftOffsets,
    rightOffsets,
    totalCenterWidth,
    totalLeftWidth,
    totalRightWidth,

    // data & virtualization
    pageRows: paged,
    rowVirtual,
    centerColVirtual,

    // callbacks
    toggleSort,
    setFilter,
    clearFilter,
    pinColumn,
    resizeColumn,
    reorderCenter,
    setPagination,
    toggleColumnVisibility, // NEW
    setAllColumnsVisibility, // NEW

    // refs
    viewportRef,
    rowKey,
  } as const;
}

// =====================
// dnd-kit Sortable header wrapper (center columns)
// =====================
function SortableHeaderWrapper<T extends RowData>({
  id,
  index,
  render,
}: {
  id: string;
  index: number;
  render: (dragProps: {
    setNodeRef: (el: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: any;
    listeners: any;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 4 : undefined,
  };
  return (
    <>{render({ setNodeRef, style, attributes, listeners, isDragging })}</>
  );
}

// =====================
// UI Components
// =====================

type HeaderCellProps<T extends RowData> = {
  column: ColumnDef<T>;
  width: number;
  onResize: (w: number) => void;
  onToggleSort: (multi: boolean) => void;
  sortDir?: SortDir | undefined;
  filterValue?: string;
  onFilterChange?: (v: string) => void;
  pinSide: PinSide;
  onPin: (side: PinSide) => void;
  sticky?: { side: "left" | "right"; offset: number } | null;
  dragHandleProps?: any;
  setRef?: (el: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
};

function HeaderCell<T extends RowData>(props: HeaderCellProps<T>) {
  const {
    column,
    width,
    onResize,
    onToggleSort,
    sortDir,
    filterValue,
    onFilterChange,
    pinSide,
    onPin,
    sticky,
    dragHandleProps,
    setRef,
    dragStyle,
  } = props;
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!column.enableResize) return;
    startX.current = e.clientX;
    startW.current = width;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      onResize(startW.current + delta);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={setRef as any}
      className="flex flex-col border-b border-gray-200 bg-white"
      style={{
        width,
        position: sticky ? ("sticky" as const) : undefined,
        left: sticky?.side === "left" ? sticky.offset : undefined,
        right: sticky?.side === "right" ? sticky.offset : undefined,
        zIndex: sticky ? 3 : undefined,
        ...(dragStyle ?? {}),
      }}
      role="columnheader"
      aria-sort={
        sortDir ? (sortDir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <div className="flex items-center gap-2 px-2 h-10 select-none">
        <button
          className="text-left flex-1 truncate"
          onClick={(e) => onToggleSort(e.shiftKey)}
          title={column.header}
        >
          {column.header}
          {sortDir ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </button>
        {/* Drag handle (only for center columns) */}
        <span
          className="cursor-grab px-1"
          {...dragHandleProps}
          title="Drag to reorder"
        >
          ⋮⋮
        </span>
        {column.enablePin && (
          <div className="flex gap-1">
            <button
              className={`px-1 text-xs rounded ${
                pinSide === "left" ? "bg-gray-200" : ""
              }`}
              onClick={() => onPin("left")}
            >
              L
            </button>
            <button
              className={`px-1 text-xs rounded ${
                pinSide === null ? "bg-gray-200" : ""
              }`}
              onClick={() => onPin(null)}
            >
              C
            </button>
            <button
              className={`px-1 text-xs rounded ${
                pinSide === "right" ? "bg-gray-200" : ""
              }`}
              onClick={() => onPin("right")}
            >
              R
            </button>
          </div>
        )}
      </div>
      {column.enableFilter && (
        <div className="px-2 pb-2">
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Filter…"
            value={filterValue ?? ""}
            onChange={(e) => onFilterChange?.(e.target.value)}
            // prevent dnd/sort/resize from stealing focus/gestures
            onPointerDownCapture={(e) => e.stopPropagation()}
            onClickCapture={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {column.enableResize && (
        <div
          className="h-4 -mb-2 cursor-col-resize self-end w-2"
          onMouseDown={onMouseDown}
          title="Drag to resize"
        />
      )}
    </div>
  );
}

type CellProps = {
  width: number;
  children: React.ReactNode;
  sticky?: { side: "left" | "right"; offset: number } | null;
};
function Cell({ width, children, sticky }: CellProps) {
  return (
    <div
      className="px-2 h-9 flex items-center border-b border-gray-100 bg-white"
      style={{
        width,
        position: sticky ? ("sticky" as const) : undefined,
        left: sticky?.side === "left" ? sticky.offset : undefined,
        right: sticky?.side === "right" ? sticky.offset : undefined,
        zIndex: sticky ? 1 : undefined,
      }}
      role="cell"
    >
      <div className="truncate w-full">{children}</div>
    </div>
  );
}

// =====================
// Main Table Component (with dnd-kit)
// =====================
export function DataTable<T extends RowData>(props: TableProps<T>) {
  const table = useTable(props);
  const {
    state,
    height,
    width,
    leftPinned,
    centerOrdered,
    rightPinned,
    leftOffsets,
    rightOffsets,
    totalCenterWidth,
    totalLeftWidth,
    totalRightWidth,
    pageRows,
    rowVirtual,
    centerColVirtual,
    toggleSort,
    setFilter,
    pinColumn,
    resizeColumn,
    reorderCenter,
    setPagination,
    toggleColumnVisibility, // NEW
    setAllColumnsVisibility, // NEW
    viewportRef,
    rowKey,
  } = table;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Build map for quick lookups
  const sortDirById = useMemo(
    () => Object.fromEntries(state.sortBy.map((s) => [s.columnId, s.dir])),
    [state.sortBy]
  );
  const filterById = useMemo(
    () => Object.fromEntries(state.filters.map((f) => [f.columnId, f.value])),
    [state.filters]
  );

  // Table viewport style
  const viewportStyle: React.CSSProperties = {
    height,
    width,
    overflow: "auto",
    position: "relative",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  const totalColsPx = totalLeftWidth + totalCenterWidth + totalRightWidth;

  // DnD handlers for center columns
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = centerOrdered.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderCenter(oldIndex, newIndex);
  };

  // Center headers (virtualized + sortable)
  const CenterHeader = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={centerOrdered.map((c) => c.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          className="flex"
          style={{ width: totalCenterWidth, position: "relative" }}
        >
          {centerColVirtual.getVirtualItems().map((vi) => {
            const col = centerOrdered[vi.index];
            if (!col) return null;
            return (
              <SortableHeaderWrapper
                key={col.id}
                id={col.id}
                index={vi.index}
                render={({
                  setNodeRef,
                  style,
                  attributes,
                  listeners,
                  isDragging,
                }) => (
                  <HeaderCell
                    column={col}
                    width={vi.size}
                    onResize={(w) => resizeColumn(col.id, w, col)}
                    onToggleSort={(multi) => toggleSort(col.id, multi)}
                    sortDir={sortDirById[col.id]}
                    filterValue={filterById[col.id]}
                    onFilterChange={(v) => setFilter(col.id, v)}
                    pinSide={state.columnPin[col.id]}
                    onPin={(side) => pinColumn(col.id, side)}
                    dragHandleProps={{ ...attributes, ...listeners }}
                    setRef={setNodeRef}
                    dragStyle={{
                      opacity: isDragging ? 0.6 : 1,
                      transform: style.transform,
                    }}
                  />
                )}
              />
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay />
    </DndContext>
  );

  const HeaderRow = () => (
    <div
      className="flex sticky top-0 z-20 bg-white border-b border-gray-200"
      role="row"
      style={{ width: totalColsPx }}
    >
      {/* Left pinned headers */}
      {leftPinned.map((c, i) => (
        <HeaderCell
          key={c.id}
          column={c}
          width={state.columnWidths[c.id] ?? c.width ?? 160}
          onResize={(w) => resizeColumn(c.id, w, c)}
          onToggleSort={(multi) => toggleSort(c.id, multi)}
          sortDir={sortDirById[c.id]}
          filterValue={filterById[c.id]}
          onFilterChange={(v) => setFilter(c.id, v)}
          pinSide={state.columnPin[c.id]}
          onPin={(side) => pinColumn(c.id, side)}
          sticky={{ side: "left", offset: leftOffsets[i] }}
        />
      ))}
      {/* Center headers (virtualized + dnd-kit) */}
      <div style={{ width: totalCenterWidth, overflow: "hidden" }}>
        <div
          style={{
            transform: `translateX(${
              centerColVirtual.getVirtualItems()[0]?.start ?? 0
            }px)`,
          }}
        >
          <CenterHeader />
        </div>
      </div>
      {/* Right pinned headers */}
      {rightPinned.map((c, i) => (
        <HeaderCell
          key={c.id}
          column={c}
          width={state.columnWidths[c.id] ?? c.width ?? 160}
          onResize={(w) => resizeColumn(c.id, w, c)}
          onToggleSort={(multi) => toggleSort(c.id, multi)}
          sortDir={sortDirById[c.id]}
          filterValue={filterById[c.id]}
          onFilterChange={(v) => setFilter(c.id, v)}
          pinSide={state.columnPin[c.id]}
          onPin={(side) => pinColumn(c.id, side)}
          sticky={{ side: "right", offset: rightOffsets[i] }}
        />
      ))}
    </div>
  );

  const Row = ({ row, rowIndex }: { row: T; rowIndex: number }) => {
    const vi = rowVirtual.getVirtualItems().find((v) => v.index === rowIndex);
    const rowTop = vi?.start ?? 0;
    const rowH = vi?.size ?? DEFAULT_ROW_H;
    return (
      <div
        className="flex absolute left-0"
        role="row"
        style={{ top: rowTop, width: totalColsPx, height: rowH }}
      >
        {/* left pinned cells */}
        {leftPinned.map((c, i) => (
          <Cell
            key={c.id}
            width={state.columnWidths[c.id] ?? c.width ?? 160}
            sticky={{ side: "left", offset: leftOffsets[i] }}
          >
            {c.cell ? c.cell({ row }) : String(getValue(row, c.accessor) ?? "")}
          </Cell>
        ))}
        {/* center virtualized cells */}
        <div style={{ width: totalCenterWidth, overflow: "hidden" }}>
          <div
            style={{
              transform: `translateX(${
                centerColVirtual.getVirtualItems()[0]?.start ?? 0
              }px)`,
              display: "flex",
            }}
          >
            {centerColVirtual.getVirtualItems().map((vi) => {
              const c = centerOrdered[vi.index];
              if (!c) return null;
              return (
                <Cell key={c.id} width={vi.size}>
                  {c.cell
                    ? c.cell({ row })
                    : String(getValue(row, c.accessor) ?? "")}
                </Cell>
              );
            })}
          </div>
        </div>
        {/* right pinned cells */}
        {rightPinned.map((c, i) => (
          <Cell
            key={c.id}
            width={state.columnWidths[c.id] ?? c.width ?? 160}
            sticky={{ side: "right", offset: rightOffsets[i] }}
          >
            {c.cell ? c.cell({ row }) : String(getValue(row, c.accessor) ?? "")}
          </Cell>
        ))}
      </div>
    );
  };

  // Pagination controls (bottom)
  const Footer = () => {
    const { pageIndex, pageSize } = state.pagination;
    const total = props.data.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const setPage = (p: number) =>
      setPagination({ pageIndex: clamp(p, 0, totalPages - 1), pageSize });
    return (
      <div className="flex items-center justify-between py-2 px-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setPage(0)}
            disabled={pageIndex === 0}
          >
            &laquo;
          </button>
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setPage(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            &lsaquo;
          </button>
          <span>
            Page {pageIndex + 1} / {totalPages}
          </span>
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setPage(pageIndex + 1)}
            disabled={pageIndex >= totalPages - 1}
          >
            &rsaquo;
          </button>
          <button
            className="px-2 py-1 border rounded"
            onClick={() => setPage(totalPages - 1)}
            disabled={pageIndex >= totalPages - 1}
          >
            &raquo;
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            Rows:
            <select
              className="border rounded px-1 py-1"
              value={pageSize}
              onChange={(e) =>
                setPagination({
                  pageIndex: 0,
                  pageSize: Number(e.target.value),
                })
              }
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  };

  // Column visibility picker (NEW)
  const allChecked = useMemo(
    () => Object.values(state.columnVisibility).every(Boolean),
    [state.columnVisibility]
  );

  const ColumnPicker = () => (
    <div className="flex flex-wrap items-center gap-3 text-sm px-1">
      <label className="inline-flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => setAllColumnsVisibility(e.target.checked)}
        />
        Check all
      </label>

      {props.columns.map((c) => (
        <label key={c.id} className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!state.columnVisibility[c.id]}
            onChange={(e) => toggleColumnVisibility(c.id, e.target.checked)}
          />
          <span className="whitespace-nowrap">{c.header}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <ColumnPicker /> {/* NEW */}
      <div
        ref={viewportRef}
        style={viewportStyle}
        role="table"
        aria-rowcount={table.pageRows.length}
      >
        <HeaderRow />
        <div
          style={{
            height: rowVirtual.getTotalSize(),
            position: "relative",
            width: totalColsPx,
          }}
        >
          {rowVirtual.getVirtualItems().map((vi) => {
            const row = table.pageRows[vi.index];
            if (!row) return null;
            return (
              <Row key={rowKey(row, vi.index)} row={row} rowIndex={vi.index} />
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export const DataTableDemo = () => {
  type Person = {
    id: number;
    name: string;
    age: number;
    city: string;
    title: string;
  };
  const columns: ColumnDef<Person>[] = [
    {
      id: "name",
      header: "Name",
      accessor: "name",
      enableSort: true,
      enableFilter: true,
      enableResize: true,
      enablePin: true,
      width: 180,
    },
    {
      id: "age",
      header: "Age",
      accessor: (r) => r.age,
      enableSort: true,
      enableFilter: true,
      enableResize: true,
      enablePin: true,
      width: 100,
      minWidth: 80,
    },
    {
      id: "city",
      header: "City",
      accessor: "city",
      enableSort: true,
      enableFilter: true,
      enableResize: true,
      enablePin: true,
    },
    {
      id: "title",
      header: "Title",
      accessor: "title",
      enableSort: true,
      enableFilter: true,
      enableResize: true,
      enablePin: true,
    },
  ];
  const data: Person[] = Array.from({ length: 999 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    age: 18 + ((i * 7) % 50),
    city: ["Tokyo", "NYC", "Paris", "Hanoi"][i % 4],
    title: ["Engineer", "Designer", "PM", "Analyst"][i % 4],
  }));

  return (
    <div className="p-4">
      <DataTable<Person>
        data={data}
        columns={columns}
        height={520}
        width={1000}
      />
    </div>
  );
};
