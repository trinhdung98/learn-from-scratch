import React from "react";

// ==========================
// Types & Constants
// ==========================

type MoleKind = "normal" | "golden" | "bomb";

type GameState = "idle" | "running" | "paused" | "gameover";

interface Mole {
  id: string;
  kind: MoleKind;
  /** Unix ms when this mole should disappear */
  expiresAt: number;
}

interface Cell {
  mole?: Mole;
}

interface GridSize {
  rows: number;
  cols: number;
}

interface Difficulty {
  id: "easy" | "normal" | "hard" | "insane";
  label: string;
  /** How often we try to spawn a mole (ms) */
  spawnEveryMs: number;
  /** Mole up-time range (ms) */
  moleUpMs: [min: number, max: number];
  /** Max moles shown simultaneously */
  concurrentMoles: number;
  /** Probability weights */
  weights: { normal: number; golden: number; bomb: number };
}

const DIFFICULTIES: Difficulty[] = [
  {
    id: "easy",
    label: "Easy",
    spawnEveryMs: 900,
    moleUpMs: [900, 1400],
    concurrentMoles: 1,
    weights: { normal: 0.85, golden: 0.1, bomb: 0.05 },
  },
  {
    id: "normal",
    label: "Normal",
    spawnEveryMs: 700,
    moleUpMs: [700, 1100],
    concurrentMoles: 2,
    weights: { normal: 0.8, golden: 0.12, bomb: 0.08 },
  },
  {
    id: "hard",
    label: "Hard",
    spawnEveryMs: 520,
    moleUpMs: [550, 900],
    concurrentMoles: 3,
    weights: { normal: 0.76, golden: 0.14, bomb: 0.1 },
  },
  {
    id: "insane",
    label: "Insane",
    spawnEveryMs: 380,
    moleUpMs: [420, 700],
    concurrentMoles: 4,
    weights: { normal: 0.7, golden: 0.15, bomb: 0.15 },
  },
];

const DEFAULT_GRID: GridSize = { rows: 3, cols: 3 };
const DEFAULT_SECONDS = 45;

// ==========================
// Utilities
// ==========================

function randInt(minInclusive: number, maxInclusive: number) {
  return (
    Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive
  );
}

function pickWeighted(weights: Record<MoleKind, number>): MoleKind {
  const r = Math.random();
  let sum = 0;
  for (const k of ["normal", "golden", "bomb"] as const) {
    sum += weights[k];
    if (r <= sum) return k;
  }
  return "normal";
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useInterval(cb: () => void, delayMs: number | null) {
  const saved = React.useRef(cb);
  React.useEffect(() => void (saved.current = cb), [cb]);
  React.useEffect(() => {
    if (delayMs == null) return;
    const id = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

// ==========================
// Component
// ==========================

const CellButton: React.FC<{
  index: number;
  hasMole: boolean;
  kind?: MoleKind;
  onWhack: (i: number) => void;
  highlight?: boolean;
}> = ({ index, hasMole, kind, onWhack, highlight }) => {
  return (
    <button
      onClick={() => onWhack(index)}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border shadow-sm flex items-center justify-center select-none transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        highlight ? "ring-2 ring-amber-400" : ""
      } ${
        hasMole
          ? "bg-emerald-50 border-emerald-300"
          : "bg-white border-gray-200"
      }`}
      aria-label={
        hasMole ? `Hole ${index + 1} mole ${kind}` : `Hole ${index + 1} empty`
      }
    >
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">
        {index + 1}
      </div>
      {hasMole && (
        <div
          className={`flex items-center justify-center rounded-full w-14 h-14 sm:w-16 sm:h-16 font-bold text-white ${
            kind === "golden"
              ? "bg-yellow-500"
              : kind === "bomb"
              ? "bg-rose-500"
              : "bg-emerald-600"
          }`}
        >
          {kind === "bomb" ? "💣" : kind === "golden" ? "⭐" : "🐹"}
        </div>
      )}
    </button>
  );
};

const StatPill: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm">
    <div className="text-gray-500">{label}</div>
    <div className="font-semibold text-gray-800">{value}</div>
  </div>
);

const ControlButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`px-3 py-2 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 active:scale-[0.98] transition ${className}`}
  >
    {children}
  </button>
);

const WhackAMole: React.FC = () => {
  // ---------- Configurable settings ----------
  const [grid, setGrid] = React.useState<GridSize>(DEFAULT_GRID);
  const [difficulty, setDifficulty] = React.useState<Difficulty>(
    DIFFICULTIES[1]
  );
  const [seconds, setSeconds] = React.useState<number>(DEFAULT_SECONDS);
  const [sound, setSound] = React.useState<boolean>(false);

  // ---------- Game runtime state ----------
  const [state, setState] = React.useState<GameState>("idle");
  const totalCells = grid.rows * grid.cols;
  const [cells, setCells] = React.useState<Cell[]>(() =>
    Array<Cell>(totalCells).fill({})
  );
  const [timeLeft, setTimeLeft] = React.useState<number>(seconds);
  const [score, setScore] = React.useState<number>(0);
  const [lives, setLives] = React.useState<number>(3);
  const [streak, setStreak] = React.useState<number>(0);
  const [best, setBest] = React.useState<number>(() =>
    Number(localStorage.getItem("wam_best") || 0)
  );
  const [hits, setHits] = React.useState<number>(0);
  const [misses, setMisses] = React.useState<number>(0);

  // keyboard support
  const [highlightIndex, setHighlightIndex] = React.useState<number | null>(
    null
  );

  // refresh cells when grid changes
  React.useEffect(() => {
    setCells(Array<Cell>(grid.rows * grid.cols).fill({}));
  }, [grid]);

  // keep timeLeft synced when seconds changes and game is idle
  React.useEffect(() => {
    if (state === "idle") setTimeLeft(seconds);
  }, [seconds, state]);

  // ---------- Game timers ----------
  // 1) countdown timer
  useInterval(
    () => {
      if (state !== "running") return;
      setTimeLeft((t) => {
        const next = t - 1;
        if (next <= 0) {
          endGame();
          return 0;
        }
        return next;
      });
    },
    state === "running" ? 1000 : null
  );

  // 2) spawn timer
  useInterval(
    () => {
      if (state !== "running") return;
      setCells((prev) => {
        const activeCount = prev.filter((c) => c.mole).length;
        if (activeCount >= difficulty.concurrentMoles) return prev;
        // pick a random empty hole
        const empties: number[] = [];
        for (let i = 0; i < prev.length; i++)
          if (!prev[i].mole) empties.push(i);
        if (empties.length === 0) return prev;
        const hole = empties[randInt(0, empties.length - 1)];
        const kind = pickWeighted(difficulty.weights);
        const lifetime = randInt(
          difficulty.moleUpMs[0],
          difficulty.moleUpMs[1]
        );
        const expiresAt = Date.now() + lifetime;
        const next = prev.slice();
        next[hole] = { mole: { id: uid(), kind, expiresAt } };
        return next;
      });
    },
    state === "running" ? difficulty.spawnEveryMs : null
  );

  // 3) cleanup expired moles (tick)
  useInterval(
    () => {
      if (state !== "running") return;
      const now = Date.now();
      setCells((prev) =>
        prev.map((c) => (c.mole && c.mole.expiresAt <= now ? {} : c))
      );
    },
    state === "running" ? 120 : null
  );

  // ---------- Actions ----------
  const startGame = () => {
    setScore(0);
    setLives(3);
    setStreak(0);
    setHits(0);
    setMisses(0);
    setCells(Array<Cell>(totalCells).fill({}));
    setTimeLeft(seconds);
    setState("running");
  };

  const pauseGame = () => setState((s) => (s === "running" ? "paused" : s));
  const resumeGame = () => setState((s) => (s === "paused" ? "running" : s));
  const resetGame = () => {
    setState("idle");
    setCells(Array<Cell>(totalCells).fill({}));
    setTimeLeft(seconds);
  };

  const endGame = () => {
    setState("gameover");
    setBest((b) => {
      const next = Math.max(b, score);
      localStorage.setItem("wam_best", String(next));
      return next;
    });
  };

  const whack = (index: number) => {
    if (state !== "running") return;
    setCells((prev) => {
      const c = prev[index];
      const next = prev.slice();
      if (c.mole) {
        // hit!
        const k = c.mole.kind;
        next[index] = {};
        setHits((h) => h + 1);
        setStreak((s) => s + 1);
        // score rules
        setScore(
          (sc) =>
            sc +
            (k === "golden" ? 5 : k === "bomb" ? -5 : 1) +
            (streak >= 4 ? 1 : 0)
        );
        if (k === "bomb") {
          // penalty
          setLives((l) => (l - 1 <= 0 ? (endGame(), 0) : l - 1));
          setStreak(0);
        } else if (k === "golden") {
          // small bonus: +1s
          setTimeLeft((t) => t + 1);
        }
      } else {
        // miss
        setMisses((m) => m + 1);
        setStreak(0);
        setScore((sc) => Math.max(0, sc - 1));
      }
      return next;
    });
  };

  // keyboard mapping: number keys 1..N => hole index
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== "running") return;
      if (e.key >= "1" && e.key <= "9") {
        const n = Number(e.key) - 1; // 0-based
        if (n < totalCells) {
          setHighlightIndex(n);
          whack(n);
        }
      } else if (e.key === " ") {
        e.preventDefault();
        pauseGame();
      }
    };
    const clear = () => setHighlightIndex(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", clear);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", clear);
    };
  }, [state, totalCells]);

  // computed
  const accuracy =
    hits + misses === 0 ? 0 : Math.round((hits / (hits + misses)) * 100);

  // accessible live region
  const liveMsg = `Score ${score}, Lives ${lives}, Time ${timeLeft}s`;

  // UI helpers
  const sizeOptions: GridSize[] = [
    { rows: 3, cols: 3 },
    { rows: 4, cols: 4 },
    { rows: 5, cols: 5 },
  ];

  return (
    <div className="min-h-[70vh] w-full p-4 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">Whack‑A‑Mole (React + TypeScript)</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          <span className="w-20 text-gray-600">Difficulty</span>
          <select
            className="px-2 py-1 border rounded-lg"
            value={difficulty.id}
            onChange={(e) =>
              setDifficulty(
                DIFFICULTIES.find(
                  (d) => d.id === (e.target.value as Difficulty["id"])
                ) || DIFFICULTIES[1]
              )
            }
            disabled={state === "running"}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2">
          <span className="w-20 text-gray-600">Grid</span>
          <select
            className="px-2 py-1 border rounded-lg"
            value={`${grid.rows}x${grid.cols}`}
            onChange={(e) => {
              const [r, c] = e.target.value.split("x").map(Number);
              setGrid({ rows: clamp(r, 2, 6), cols: clamp(c, 2, 6) });
            }}
            disabled={state === "running"}
          >
            {sizeOptions.map((g) => (
              <option key={`${g.rows}x${g.cols}`} value={`${g.rows}x${g.cols}`}>
                {g.rows}×{g.cols}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2">
          <span className="w-20 text-gray-600">Duration</span>
          <input
            type="number"
            min={15}
            max={180}
            className="px-2 py-1 border rounded-lg w-24"
            value={seconds}
            onChange={(e) =>
              setSeconds(clamp(parseInt(e.target.value || "0", 10), 15, 180))
            }
            disabled={state === "running"}
          />
          <span>s</span>
        </label>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
          />
          <span>Sound</span>
        </label>
        {state !== "running" && state !== "paused" && (
          <ControlButton onClick={startGame}>Start</ControlButton>
        )}
        {state === "running" && (
          <ControlButton onClick={pauseGame}>Pause</ControlButton>
        )}
        {state === "paused" && (
          <ControlButton onClick={resumeGame}>Resume</ControlButton>
        )}
        <ControlButton onClick={resetGame}>Reset</ControlButton>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Score" value={score} />
        <StatPill label="Best" value={best} />
        <StatPill label="Lives" value={lives} />
        <StatPill label="Time" value={`${timeLeft}s`} />
        <StatPill label="Streak" value={streak} />
        <StatPill label="Accuracy" value={`${accuracy}%`} />
      </div>

      {/* Live region for SR */}
      <div className="sr-only" aria-live="polite">
        {liveMsg}
      </div>

      {/* Board */}
      <div
        className="grid gap-3 mt-2"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(5.5rem, 6.5rem))`,
        }}
      >
        {Array.from({ length: totalCells }).map((_, i) => {
          const mole = cells[i].mole;
          const hasMole = Boolean(mole);
          const kind = mole?.kind;
          const highlight = highlightIndex === i;
          return (
            <CellButton
              key={i}
              index={i}
              hasMole={hasMole}
              kind={kind}
              onWhack={whack}
              highlight={highlight}
            />
          );
        })}
      </div>

      {/* Overlays */}
      {state !== "running" && (
        <div className="mt-2 text-sm text-gray-600 max-w-xl text-center">
          {state === "idle" && (
            <p>
              Press <kbd className="px-1 border rounded">Start</kbd> to begin.
              During play you can press number keys <strong>1‑9</strong> to
              whack by keyboard, and{" "}
              <kbd className="px-1 border rounded">Space</kbd> to pause.
            </p>
          )}
          {state === "paused" && (
            <p>
              Game paused. Press <strong>Resume</strong> to continue.
            </p>
          )}
          {state === "gameover" && (
            <div className="flex flex-col items-center gap-2">
              <p className="font-semibold">Game Over! Final score: {score}</p>
              <div className="text-xs text-gray-500">
                Hits: {hits} · Misses: {misses} · Accuracy: {accuracy}%
              </div>
              <div className="flex gap-2 mt-1">
                <ControlButton onClick={startGame}>Play Again</ControlButton>
                <ControlButton onClick={resetGame}>Back to Setup</ControlButton>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="text-xs text-gray-500 mt-2">
        Fully type‑safe • Difficulty levels • Keyboard support • Lives & streaks
        • Local best score
      </footer>
    </div>
  );
};

export default WhackAMole;
