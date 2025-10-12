import React, { useMemo, useState } from "react";

// ---------- Types ----------
type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[]; // flat array length = size*size

interface WinResult {
  winner: Player;
  line: number[]; // indices that form the winning line
}

interface Props {
  /** Initial board size (NxN). Can be changed at runtime. */
  initialSize?: number; // default 3
  /** How many in a row to win. Default = size. */
  initialWinLength?: number; // default = size
}

// ---------- Helpers ----------
const idx = (row: number, col: number, size: number) => row * size + col;

function createEmptyBoard(size: number): Board {
  return Array<Cell>(size * size).fill(null);
}

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

/**
 * Check for a winner on an NxN board for a given winLength.
 * Returns the winning player and the indices that compose the line; otherwise null.
 */
function getWinner(
  board: Board,
  size: number,
  winLength: number
): WinResult | null {
  const directions: Array<[dr: number, dc: number]> = [
    [1, 0], // vertical
    [0, 1], // horizontal
    [1, 1], // diag ↘
    [1, -1], // diag ↙
  ];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const startVal = board[idx(r, c, size)];
      if (!startVal) continue;

      for (const [dr, dc] of directions) {
        const line: number[] = [idx(r, c, size)];
        let rr = r + dr;
        let cc = c + dc;
        while (
          inBounds(rr, cc, size) &&
          board[idx(rr, cc, size)] === startVal &&
          line.length < winLength
        ) {
          line.push(idx(rr, cc, size));
          rr += dr;
          cc += dc;
        }
        if (line.length === winLength) {
          return { winner: startVal, line };
        }
      }
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every((c) => c !== null);
}

// ---------- UI Component ----------
const CellButton: React.FC<{
  value: Cell;
  onClick: () => void;
  isWinning?: boolean;
}> = ({ value, onClick, isWinning }) => (
  <button
    onClick={onClick}
    className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-semibold rounded-2xl shadow-md transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      isWinning
        ? "bg-green-100 border-2 border-green-500"
        : "bg-white border border-gray-200"
    }`}
    aria-label={value ? `Cell ${value}` : "Empty cell"}
  >
    {value}
  </button>
);

const ControlSelect: React.FC<{
  label: string;
  value: number;
  setValue: (n: number) => void;
  options: number[];
}> = ({ label, value, setValue, options }) => (
  <label className="flex items-center gap-2 text-sm">
    <span className="text-gray-700 w-28">{label}</span>
    <select
      className="border rounded-lg px-2 py-1 bg-white"
      value={value}
      onChange={(e) => setValue(parseInt(e.target.value, 10))}
    >
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  </label>
);

const StatusBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
    {children}
  </div>
);

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`px-3 py-2 rounded-xl shadow-sm border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition ${className}`}
  >
    {children}
  </button>
);

const TicTacToe: React.FC<Props> = ({ initialSize = 3, initialWinLength }) => {
  const [size, setSize] = useState<number>(Math.max(3, initialSize));
  const [winLength, setWinLength] = useState<number>(
    initialWinLength ?? Math.max(3, initialSize)
  );
  const [board, setBoard] = useState<Board>(() =>
    createEmptyBoard(initialSize)
  );
  const [current, setCurrent] = useState<Player>("X");
  const [result, setResult] = useState<WinResult | null>(null);

  // Keep winLength within [3, size]
  const normalizedWin = useMemo(
    () => Math.min(Math.max(3, winLength), size),
    [winLength, size]
  );

  // Recreate board when size changes
  React.useEffect(() => {
    setBoard(createEmptyBoard(size));
    setResult(null);
    setCurrent("X");
    // Ensure win length not larger than size
    setWinLength((prev) => Math.min(Math.max(3, prev), size));
  }, [size]);

  const handleClick = (i: number) => {
    if (result || board[i]) return; // ignore when finished or occupied
    const next: Board = board.slice();
    next[i] = current;
    const maybeWin = getWinner(next, size, normalizedWin);
    setBoard(next);
    if (maybeWin) {
      setResult(maybeWin);
    } else if (isDraw(next)) {
      // Represent draw as result = null but we can display based on draw state
      setResult(null);
      // keep current for clarity
    } else {
      setCurrent((p) => (p === "X" ? "O" : "X"));
    }
  };

  const reset = () => {
    setBoard(createEmptyBoard(size));
    setCurrent("X");
    setResult(null);
  };

  const winner = result?.winner ?? null;
  const hasDraw = !winner && isDraw(board);

  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Type‑Safe Tic‑Tac‑Toe</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <ControlSelect
          label="Board size"
          value={size}
          setValue={setSize}
          options={[3, 4, 5, 6, 7, 8, 9, 10]}
        />
        <ControlSelect
          label="Win length"
          value={normalizedWin}
          setValue={setWinLength}
          options={Array.from({ length: 8 }, (_, i) => i + 3).filter(
            (n) => n <= size
          )}
        />
        <ActionButton onClick={reset}>Reset</ActionButton>
      </div>

      {/* Status */}
      <div className="h-6">
        {winner ? (
          <StatusBadge>
            Winner: <span className="font-semibold">{winner}</span>
          </StatusBadge>
        ) : hasDraw ? (
          <StatusBadge>Draw</StatusBadge>
        ) : (
          <StatusBadge>
            Turn: <span className="font-semibold">{current}</span>
          </StatusBadge>
        )}
      </div>

      {/* Board */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(3rem, 4.5rem))` }}
        role="grid"
        aria-label={`${size} by ${size} tic tac toe board`}
      >
        {board.map((cell, i) => (
          <CellButton
            key={i}
            value={cell}
            onClick={() => handleClick(i)}
            isWinning={!!result?.line.includes(i)}
          />
        ))}
      </div>

      <footer className="text-xs text-gray-500 mt-2">
        Fully type‑safe • NxN support • Adjustable win length
      </footer>
    </div>
  );
};

export default TicTacToe;
