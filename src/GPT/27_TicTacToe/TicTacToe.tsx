import React from "react";

/* ---------- Types & Helpers ---------- */

type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[];

type GameStatus = "playing" | "won" | "draw";
type Difficulty = "easy" | "hard";

type GameResult = {
  status: GameStatus;
  winner: Player | null;
  winningLine: number[] | null;
};

type Scores = {
  X: number;
  O: number;
  draws: number;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- Board / Win lines ---------- */

const emptyBoard = (size: number): Board => Array<Cell>(size * size).fill(null);

/**
 * Generate all winning lines for a size x size board
 * where winLength in a row is needed to win.
 */
function getWinningLines(size: number, winLength: number): number[][] {
  const lines: number[][] = [];

  // Rows
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) {
        line.push(r * size + (c + i));
      }
      lines.push(line);
    }
  }

  // Columns
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - winLength; r++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) {
        line.push((r + i) * size + c);
      }
      lines.push(line);
    }
  }

  // Diagonal (down-right)
  for (let r = 0; r <= size - winLength; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) {
        line.push((r + i) * size + (c + i));
      }
      lines.push(line);
    }
  }

  // Diagonal (down-left)
  for (let r = 0; r <= size - winLength; r++) {
    for (let c = winLength - 1; c < size; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) {
        line.push((r + i) * size + (c - i));
      }
      lines.push(line);
    }
  }

  return lines;
}

function evaluateBoard(board: Board, winningLines: number[][]): GameResult {
  for (const line of winningLines) {
    const [firstIdx] = line;
    const first = board[firstIdx];
    if (!first) continue;
    if (line.every((idx) => board[idx] === first)) {
      return {
        status: "won",
        winner: first,
        winningLine: line,
      };
    }
  }

  if (board.every((cell) => cell !== null)) {
    return { status: "draw", winner: null, winningLine: null };
  }

  return { status: "playing", winner: null, winningLine: null };
}

/* ---------- Minimax AI (Hard mode) ---------- */

function minimax(
  board: Board,
  currentPlayer: Player,
  aiPlayer: Player,
  depth: number,
  winningLines: number[][]
): { score: number; move: number | null } {
  const result = evaluateBoard(board, winningLines);

  if (result.status === "won") {
    if (result.winner === aiPlayer) {
      return { score: 10 - depth, move: null };
    } else {
      return { score: depth - 10, move: null };
    }
  }

  if (result.status === "draw") {
    return { score: 0, move: null };
  }

  const isMaximizing = currentPlayer === aiPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMove: number | null = null;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;

    const newBoard = [...board];
    newBoard[i] = currentPlayer;

    const { score } = minimax(
      newBoard,
      currentPlayer === "X" ? "O" : "X",
      aiPlayer,
      depth + 1,
      winningLines
    );

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  return { score: bestScore, move: bestMove };
}

/* ---------- Component ---------- */

export default function TicTacToeGame() {
  // Config
  const [size, setSize] = React.useState(3);
  const [winLength, setWinLength] = React.useState(3);

  // Game state
  const [history, setHistory] = React.useState<Board[]>(() => [emptyBoard(3)]);
  const [moveIndex, setMoveIndex] = React.useState(0);
  const [scores, setScores] = React.useState<Scores>({
    X: 0,
    O: 0,
    draws: 0,
  });

  // AI
  const [vsComputer, setVsComputer] = React.useState(false);
  const [aiPlayer, setAiPlayer] = React.useState<Player>("O");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("hard");

  // Derived
  const winningLines = React.useMemo(
    () => getWinningLines(size, winLength),
    [size, winLength]
  );
  const board = history[moveIndex] ?? emptyBoard(size);
  const result = evaluateBoard(board, winningLines);
  const { status, winner, winningLine } = result;
  const currentPlayer: Player = moveIndex % 2 === 0 ? "X" : "O";

  // Keyboard focus refs
  const cellRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  /* ---------- Config change handlers (size & winLength) ---------- */

  const resetBoardForConfig = (newSize: number) => {
    setHistory([emptyBoard(newSize)]);
    setMoveIndex(0);
  };

  const handleChangeSize = (newSize: number) => {
    const clampedSize = Math.min(Math.max(newSize, 3), 5);
    const newWinLength = Math.min(winLength, clampedSize);
    setSize(clampedSize);
    setWinLength(newWinLength);
    resetBoardForConfig(clampedSize);
  };

  const handleChangeWinLength = (newWin: number) => {
    const clamped = Math.min(Math.max(newWin, 3), size);
    setWinLength(clamped);
    resetBoardForConfig(size);
  };

  /* ---------- Game actions ---------- */

  const applyMove = (index: number, player: Player) => {
    if (status !== "playing") return;
    if (board[index] !== null) return;

    const newBoard = [...board];
    newBoard[index] = player;
    const newResult = evaluateBoard(newBoard, winningLines);

    const newHistory = history.slice(0, moveIndex + 1);
    newHistory.push(newBoard);

    setHistory(newHistory);
    setMoveIndex(newHistory.length - 1);

    if (newResult.status === "won" && newResult.winner) {
      setScores((prev) => ({
        ...prev,
        [newResult.winner!]: prev[newResult.winner!] + 1,
      }));
    } else if (newResult.status === "draw") {
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
    }
  };

  const handleCellClick = (index: number) => {
    if (vsComputer && currentPlayer === aiPlayer) return;
    applyMove(index, currentPlayer);
  };

  const handleNewGame = () => {
    setHistory([emptyBoard(size)]);
    setMoveIndex(0);
  };

  const handleUndo = () => {
    if (moveIndex <= 0 || status !== "playing") return;
    setMoveIndex((idx) => Math.max(idx - 1, 0));
  };

  const handleToggleVsComputer = () => {
    if (history.length > 1 && status === "playing") {
      const ok = window.confirm(
        "Toggling vs Computer will reset the current game. Continue?"
      );
      if (!ok) return;
    }
    setVsComputer((prev) => !prev);
    handleNewGame();
  };

  const handleSwitchAiSide = () => {
    if (!vsComputer) return;
    setAiPlayer((prev) => (prev === "X" ? "O" : "X"));
    handleNewGame();
  };

  const handleChangeDifficulty = (value: Difficulty) => {
    setDifficulty(value);
    handleNewGame();
  };

  /* ---------- AI move effect ---------- */

  React.useEffect(() => {
    if (!vsComputer) return;
    if (status !== "playing") return;
    if (currentPlayer !== aiPlayer) return;

    const timeout = window.setTimeout(() => {
      const available: number[] = [];
      board.forEach((cell, idx) => {
        if (cell === null) available.push(idx);
      });
      if (available.length === 0) return;

      let move: number | null = null;

      if (difficulty === "easy") {
        move = available[Math.floor(Math.random() * available.length)];
      } else {
        const { move: bestMove } = minimax(
          board,
          aiPlayer,
          aiPlayer,
          0,
          winningLines
        );
        move = bestMove != null ? bestMove : available[0];
      }

      if (move != null) {
        applyMove(move, aiPlayer);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    vsComputer,
    status,
    currentPlayer,
    aiPlayer,
    board,
    difficulty,
    winningLines,
  ]);

  /* ---------- Status text ---------- */

  const statusText = (() => {
    if (status === "won") {
      const who =
        vsComputer && winner === aiPlayer ? "Computer" : `Player ${winner}`;
      return `${who} wins!`;
    }
    if (status === "draw") return "It's a draw.";
    return `Current player: ${currentPlayer}${
      vsComputer ? (currentPlayer === aiPlayer ? " (Computer)" : " (You)") : ""
    }`;
  })();

  /* ---------- History jump ---------- */

  const jumpTo = (index: number) => {
    setMoveIndex(index);
  };

  /* ---------- Keyboard controls for cells (dynamic size) ---------- */

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const key = e.key;
    const row = Math.floor(index / size);
    const col = index % size;

    if (key === "Enter" || key === " ") {
      e.preventDefault();
      handleCellClick(index);
      return;
    }

    let targetIndex = index;

    if (key === "ArrowUp") {
      e.preventDefault();
      const newRow = (row + size - 1) % size;
      targetIndex = newRow * size + col;
    } else if (key === "ArrowDown") {
      e.preventDefault();
      const newRow = (row + 1) % size;
      targetIndex = newRow * size + col;
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      const newCol = (col + size - 1) % size;
      targetIndex = row * size + newCol;
    } else if (key === "ArrowRight") {
      e.preventDefault();
      const newCol = (col + 1) % size;
      targetIndex = row * size + newCol;
    } else {
      return;
    }

    const targetButton = cellRefs.current[targetIndex];
    if (targetButton) {
      targetButton.focus();
    }
  };

  /* ---------- Layout helpers ---------- */

  const gridColsClass =
    size === 3 ? "grid-cols-3" : size === 4 ? "grid-cols-4" : "grid-cols-5";

  const possibleWinLengths = Array.from({ length: size - 2 }, (_, i) => i + 3); // 3..size

  /* ---------- Render ---------- */

  return (
    <div className="mx-auto my-6 max-w-4xl rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tic-tac-toe (N-in-a-row)</h1>
          <p className="text-[0.75rem] text-slate-500">
            Choose board size & win length. Includes history, AI, and keyboard
            controls.
          </p>
        </div>

        {/* Scoreboard */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.75rem]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Score</span>
            <span>
              X: <span className="font-bold text-slate-900">{scores.X}</span>
            </span>
            <span>
              O: <span className="font-bold text-slate-900">{scores.O}</span>
            </span>
            <span>
              Draws:{" "}
              <span className="font-bold text-slate-900">{scores.draws}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top controls: config + AI + actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Board size */}
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Board size:</span>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[0.7rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={size}
              onChange={(e) => handleChangeSize(Number(e.target.value))}
            >
              <option value={3}>3 × 3</option>
              <option value={4}>4 × 4</option>
              <option value={5}>5 × 5</option>
            </select>
          </div>

          {/* Win length */}
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Win length:</span>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[0.7rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={winLength}
              onChange={(e) => handleChangeWinLength(Number(e.target.value))}
            >
              {possibleWinLengths.map((n) => (
                <option key={n} value={n}>
                  {n} in a row
                </option>
              ))}
            </select>
          </div>

          {/* vs Computer */}
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              checked={vsComputer}
              onChange={handleToggleVsComputer}
            />
            <span className="text-slate-700">Play vs Computer</span>
          </label>

          {vsComputer && (
            <>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-2 py-0.5 text-[0.7rem] text-slate-700 hover:bg-slate-100"
                onClick={handleSwitchAiSide}
              >
                AI plays: <span className="font-semibold">{aiPlayer}</span>
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[0.7rem] text-slate-500">
                  Difficulty:
                </span>
                <select
                  className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[0.7rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={difficulty}
                  onChange={(e) =>
                    handleChangeDifficulty(e.target.value as Difficulty)
                  }
                >
                  <option value="easy">Easy (Random)</option>
                  <option value="hard">Hard (Minimax)</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
            onClick={handleNewGame}
          >
            New Game
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            onClick={handleUndo}
            disabled={moveIndex <= 0 || status !== "playing"}
          >
            Undo
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {statusText}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Board */}
        <div className="mx-auto flex max-w-sm flex-col items-center md:mx-0">
          <div
            className={classNames(
              "grid aspect-square w-full gap-1",
              size === 3
                ? "grid-cols-3"
                : size === 4
                ? "grid-cols-4"
                : "grid-cols-5"
            )}
            aria-label="Tic tac toe board"
            role="grid"
          >
            {board.map((cell, index) => {
              const isWinningCell = winningLine && winningLine.includes(index);
              const isDisabled = cell !== null || status !== "playing";

              return (
                <button
                  key={index}
                  type="button"
                  role="gridcell"
                  aria-label={`Cell ${index + 1}`}
                  ref={(el) => {
                    cellRefs.current[index] = el;
                  }}
                  onClick={() => handleCellClick(index)}
                  onKeyDown={(e) => handleCellKeyDown(e, index)}
                  // still allow keyboard focusing even if disabled visually
                  disabled={isDisabled && !vsComputer}
                  className={classNames(
                    "flex items-center justify-center rounded-md border text-3xl font-semibold transition-colors",
                    "border-slate-300 bg-white hover:bg-slate-50",
                    "min-w-[48px] min-h-[48px]", // 👈 added min size
                    isDisabled && "cursor-default",
                    isWinningCell &&
                      "border-emerald-500 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {cell === "X" && <span className="text-indigo-600">X</span>}
                  {cell === "O" && <span className="text-rose-500">O</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* History timeline */}
        <div className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <h2 className="mb-2 text-[0.8rem] font-semibold text-slate-700">
            Game History
          </h2>
          {history.length === 1 ? (
            <p className="text-[0.75rem] text-slate-500">No moves yet.</p>
          ) : (
            <ol className="flex flex-wrap gap-1">
              {history.map((_, idx) => {
                const label =
                  idx === 0
                    ? "Start"
                    : `Move ${idx} (${idx % 2 === 1 ? "X" : "O"})`;
                const isCurrent = idx === moveIndex;
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => jumpTo(idx)}
                      className={classNames(
                        "rounded-full border px-2 py-0.5",
                        "text-[0.7rem]",
                        isCurrent
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-2 text-[0.7rem] text-slate-500">
            Click a move to jump in time. Changing size/win length resets the
            current game.
          </p>
        </div>
      </div>
    </div>
  );
}
