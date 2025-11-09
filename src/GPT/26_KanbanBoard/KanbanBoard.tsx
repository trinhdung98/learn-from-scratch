import React from "react";

/* ---------- Types ---------- */

type CardID = string;
type ColumnID = string;

type Card = {
  id: CardID;
  title: string;
  description: string;
  assignee: string;
  dueDate: string | null; // ISO date string
};

type Column = {
  id: ColumnID;
  title: string;
  limit?: number | null; // optional WIP limit
  cards: Card[];
};

type DragState = {
  cardId: CardID | null;
  fromColumnId: ColumnID | null;
};

type BoardState = {
  columns: Column[];
};

/* ---------- Sample initial data ---------- */

const initialBoard: BoardState = {
  columns: [
    {
      id: "todo",
      title: "To Do",
      limit: 5,
      cards: [
        {
          id: "c1",
          title: "Design login page",
          description: "Create responsive login page with error states.",
          assignee: "Alice",
          dueDate: null,
        },
        {
          id: "c2",
          title: "Write Kanban demo",
          description:
            "Implement Kanban board in React for interview practice.",
          assignee: "You",
          dueDate: new Date().toISOString().slice(0, 10),
        },
      ],
    },
    {
      id: "inprogress",
      title: "In Progress",
      limit: 3,
      cards: [
        {
          id: "c3",
          title: "API integration",
          description: "Hook up task CRUD to backend.",
          assignee: "Bob",
          dueDate: null,
        },
      ],
    },
    {
      id: "done",
      title: "Done",
      limit: null,
      cards: [
        {
          id: "c4",
          title: "Set up Tailwind",
          description: "Configure TailwindCSS for the project.",
          assignee: "Charlie",
          dueDate: null,
        },
      ],
    },
  ],
};

/* ---------- Utils ---------- */

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function loadBoardFromStorage(): BoardState {
  if (typeof window === "undefined") return initialBoard;
  try {
    const raw = window.localStorage.getItem("kanban-board-demo");
    if (!raw) return initialBoard;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.columns)) return initialBoard;
    return parsed;
  } catch {
    return initialBoard;
  }
}

function saveBoardToStorage(board: BoardState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("kanban-board-demo", JSON.stringify(board));
  } catch {
    // ignore
  }
}

/* ---------- Card Form ---------- */

type CardFormProps = {
  initial?: Partial<Card>;
  onSubmit: (card: Omit<Card, "id">) => void;
  onCancel?: () => void;
};

function CardForm({ initial, onSubmit, onCancel }: CardFormProps) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? ""
  );
  const [assignee, setAssignee] = React.useState(initial?.assignee ?? "");
  const [dueDate, setDueDate] = React.useState(initial?.dueDate ?? "");

  const [touched, setTouched] = React.useState(false);

  const isValid = title.trim().length >= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      dueDate: dueDate || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-xs">
      <div>
        <label className="mb-1 block font-medium text-slate-700">Title</label>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Task title"
        />
        {touched && !isValid && (
          <p className="mt-1 text-[0.7rem] text-red-500">
            Title must be at least 3 characters.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block font-medium text-slate-700">
          Description
        </label>
        <textarea
          className="w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the task..."
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block font-medium text-slate-700">
            Assignee
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Name"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block font-medium text-slate-700">Due</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            value={dueDate ?? ""}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-transparent px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={!isValid}
        >
          Save
        </button>
      </div>
    </form>
  );
}

/* ---------- Card Component ---------- */

type CardProps = {
  card: Card;
  columnId: ColumnID;
  onEdit: (cardId: CardID, updates: Omit<Card, "id">) => void;
  onDelete: (cardId: CardID) => void;
  onDragStart: (cardId: CardID, columnId: ColumnID) => void;
  onDragEnd: () => void;
};

function CardItem({
  card,
  columnId,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: CardProps) {
  const [isEditing, setIsEditing] = React.useState(false);

  const handleEditSubmit = (updates: Omit<Card, "id">) => {
    onEdit(card.id, updates);
    setIsEditing(false);
  };

  return (
    <div
      className="mb-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm"
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) return;
        onDragStart(card.id, columnId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ cardId: card.id, fromColumnId: columnId })
        );
      }}
      onDragEnd={onDragEnd}
      role="button"
      aria-grabbed="false"
    >
      {isEditing ? (
        <CardForm
          initial={card}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-800">
              {card.title}
            </h4>
            <button
              type="button"
              className="rounded px-1 text-[0.65rem] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          </div>
          {card.description && (
            <p className="mt-1 line-clamp-3 text-[0.75rem] text-slate-600">
              {card.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between text-[0.7rem] text-slate-500">
            <span>{card.assignee || "Unassigned"}</span>
            <div className="flex items-center gap-2">
              {card.dueDate && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                  ⏰ {card.dueDate}
                </span>
              )}
              <button
                type="button"
                className="rounded px-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => onDelete(card.id)}
              >
                ✕
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Column Component ---------- */

type ColumnProps = {
  column: Column;
  filter: string;
  onAddCard: (columnId: ColumnID, card: Omit<Card, "id">) => void;
  onEditCard: (
    columnId: ColumnID,
    cardId: CardID,
    updates: Omit<Card, "id">
  ) => void;
  onDeleteCard: (columnId: ColumnID, cardId: CardID) => void;
  onDeleteColumn: (columnId: ColumnID) => void;
  onDropCard: (
    toColumnId: ColumnID,
    cardId: CardID,
    fromColumnId: ColumnID
  ) => void;
  dragState: DragState;
  setDragState: (s: DragState) => void;
};

function ColumnView({
  column,
  filter,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onDeleteColumn,
  onDropCard,
  dragState,
  setDragState,
}: ColumnProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredCards = column.cards.filter((card) => {
    if (!normalizedFilter) return true;
    const hay =
      `${card.title} ${card.description} ${card.assignee}`.toLowerCase();
    return hay.includes(normalizedFilter);
  });

  const isOverLimit =
    column.limit != null && column.cards.length >= column.limit;

  const handleCardDropOnColumn = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    try {
      const parsed = JSON.parse(data) as {
        cardId: CardID;
        fromColumnId: ColumnID;
      };
      if (!parsed.cardId || !parsed.fromColumnId) return;
      if (column.limit != null && column.cards.length >= column.limit) {
        // limit reached, ignore move
        return;
      }
      onDropCard(column.id, parsed.cardId, parsed.fromColumnId);
      setDragState({ cardId: null, fromColumnId: null });
    } catch {
      // ignore
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <section
      className={classNames(
        "flex h-full w-72 flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50",
        dragState.cardId && "transition-colors"
      )}
      aria-label={column.title}
      role="group"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            {column.title}
          </h3>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[0.65rem] text-slate-600">
            {column.cards.length}
            {column.limit != null && ` / ${column.limit}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded px-1 text-[0.7rem] text-slate-500 hover:bg-slate-100"
            onClick={() => setIsAdding((prev) => !prev)}
          >
            + Card
          </button>
          <button
            type="button"
            className="rounded px-1 text-[0.7rem] text-slate-400 hover:bg-red-50 hover:text-red-600"
            onClick={() => {
              if (
                column.cards.length > 0 &&
                !window.confirm("Delete column and all its cards?")
              ) {
                return;
              }
              onDeleteColumn(column.id);
            }}
          >
            ⋮
          </button>
        </div>
      </header>

      {/* Add card form */}
      {isAdding && (
        <div className="border-b border-slate-200 px-3 py-2">
          <CardForm
            onSubmit={(card) => {
              onAddCard(column.id, card);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Limit notice */}
      {isOverLimit && (
        <p className="px-3 pt-2 text-[0.7rem] text-red-500">
          Column limit reached.
        </p>
      )}

      {/* Cards container (drop zone) */}
      <div
        className={classNames(
          "flex-1 overflow-y-auto px-3 pb-3 pt-2",
          dragState.cardId &&
            (!isOverLimit
              ? "outline outline-1 outline-dashed outline-indigo-200"
              : "outline outline-1 outline-dashed outline-red-200")
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCardDropOnColumn}
        onDragEnter={handleDragEnter}
        aria-dropeffect="move"
      >
        {filteredCards.length === 0 ? (
          <p className="mb-2 text-[0.7rem] text-slate-400">
            {normalizedFilter ? "No matching cards." : "No cards yet."}
          </p>
        ) : (
          filteredCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              columnId={column.id}
              onEdit={(cardId, updates) =>
                onEditCard(column.id, cardId, updates)
              }
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              onDragStart={(cardId, fromCol) =>
                setDragState({ cardId, fromColumnId: fromCol })
              }
              onDragEnd={() =>
                setDragState({ cardId: null, fromColumnId: null })
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ---------- Main Kanban Board ---------- */

export default function KanbanBoardDemo() {
  const [board, setBoard] = React.useState<BoardState>(() =>
    loadBoardFromStorage()
  );
  const [dragState, setDragState] = React.useState<DragState>({
    cardId: null,
    fromColumnId: null,
  });
  const [search, setSearch] = React.useState("");
  const [newColumnTitle, setNewColumnTitle] = React.useState("");

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    saveBoardToStorage(board);
  }, [board]);

  // keyboard shortcuts: "/" focuses search, "N" creates quick card in first column
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (!board.columns.length) return;
        const firstCol = board.columns[0];
        setBoard((prev) => {
          const columns = prev.columns.map((col) =>
            col.id === firstCol.id
              ? {
                  ...col,
                  cards: [
                    {
                      id: `card-${Date.now()}`,
                      title: "New task",
                      description: "",
                      assignee: "",
                      dueDate: null,
                    },
                    ...col.cards,
                  ],
                }
              : col
          );
          return { columns };
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [board.columns]);

  const handleAddCard = (columnId: ColumnID, card: Omit<Card, "id">) => {
    setBoard((prev) => ({
      columns: prev.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              cards: [
                ...col.cards,
                {
                  id: `card-${Date.now()}`,
                  ...card,
                },
              ],
            }
          : col
      ),
    }));
  };

  const handleEditCard = (
    columnId: ColumnID,
    cardId: CardID,
    updates: Omit<Card, "id">
  ) => {
    setBoard((prev) => ({
      columns: prev.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              cards: col.cards.map((card) =>
                card.id === cardId ? { ...card, ...updates } : card
              ),
            }
          : col
      ),
    }));
  };

  const handleDeleteCard = (columnId: ColumnID, cardId: CardID) => {
    setBoard((prev) => ({
      columns: prev.columns.map((col) =>
        col.id === columnId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col
      ),
    }));
  };

  const handleDeleteColumn = (columnId: ColumnID) => {
    setBoard((prev) => ({
      columns: prev.columns.filter((col) => col.id !== columnId),
    }));
  };

  const handleDropCard = (
    toColumnId: ColumnID,
    cardId: CardID,
    fromColumnId: ColumnID
  ) => {
    if (fromColumnId === toColumnId) return;
    setBoard((prev) => {
      const columnsCopy = prev.columns.map((col) => ({
        ...col,
        cards: [...col.cards],
      }));
      const fromCol = columnsCopy.find((c) => c.id === fromColumnId);
      const toCol = columnsCopy.find((c) => c.id === toColumnId);
      if (!fromCol || !toCol) return prev;

      const idx = fromCol.cards.findIndex((c) => c.id === cardId);
      if (idx === -1) return prev;
      const [card] = fromCol.cards.splice(idx, 1);
      toCol.cards.push(card);
      return { columns: columnsCopy };
    });
  };

  const handleAddColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    const id = `col-${Date.now()}`;
    setBoard((prev) => ({
      columns: [
        ...prev.columns,
        {
          id,
          title,
          limit: null,
          cards: [],
        },
      ],
    }));
    setNewColumnTitle("");
  };

  const totalCards = board.columns.reduce(
    (sum, col) => sum + col.cards.length,
    0
  );

  return (
    <div className="mx-auto my-6 max-w-6xl rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-md">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Kanban Board</h1>
          <p className="text-[0.75rem] text-slate-500">
            Drag cards between columns. Press{" "}
            <kbd className="rounded bg-slate-100 px-1">/</kbd> to search,{" "}
            <kbd className="rounded bg-slate-100 px-1">N</kbd> to add a quick
            task.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-[0.75rem] text-slate-500">
            <span>Total cards:</span>
            <span className="font-semibold text-slate-700">{totalCards}</span>
          </div>
          <div>
            <label className="mb-1 block text-[0.7rem] font-medium text-slate-700">
              Search
            </label>
            <input
              ref={searchInputRef}
              className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              placeholder="Filter by title, assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.7rem] font-medium text-slate-700">
              New column
            </label>
            <div className="flex gap-1">
              <input
                className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                placeholder="Column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
              />
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={handleAddColumn}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        aria-label="Kanban columns"
      >
        {board.columns.length === 0 ? (
          <p className="text-sm text-slate-500">
            No columns yet. Create one from the top-right.
          </p>
        ) : (
          board.columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              filter={search}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onDeleteColumn={handleDeleteColumn}
              onDropCard={handleDropCard}
              dragState={dragState}
              setDragState={setDragState}
            />
          ))
        )}
      </div>
    </div>
  );
}
