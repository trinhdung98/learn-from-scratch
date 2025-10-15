import React from "react";

// ==========================
// Types & Constants
// ==========================

type Mode = "daily" | "random";

type LetterMark = "correct" | "present" | "absent";

type KeyStatus = LetterMark | "unused";

interface EvalCell {
  ch: string; // uppercase A-Z or empty
  mark?: LetterMark; // undefined while typing
}

interface GuessRow {
  cells: EvalCell[]; // length = wordLength
  submitted: boolean;
}

interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<number, number>; // attempt index -> count
}

interface Props {
  wordLength?: number; // default 5
  maxAttempts?: number; // default 6
  hardModeDefault?: boolean; // must use revealed hints
  modeDefault?: Mode; // "daily" | "random"
  /** Optional list of possible solutions (same word length, uppercase) */
  solutions?: string[];
  /** Optional list of allowed guesses (uppercase). If omitted, we allow any A-Z of wordLength */
  guesses?: string[];
}

const DEFAULT_SOLUTIONS_5 = [
  "REACT",
  "STATE",
  "HOOKS",
  "TYPES",
  "TRACE",
  "PROPS",
  "ROUTE",
  "ARRAY",
  "LOGIC",
  "INPUT",
  "MODEL",
  "MOUSE",
  "STACK",
  "QUERY",
  "CACHE",
  "ASIDE",
  "DEPTH",
  "POWER",
  "GHOST",
  "EVENT",
  "ERROR",
  "GUESS",
  "SHARE",
  "SOUND",
  "BOARD",
  "FIELD",
  "FRAME",
  "LIGHT",
  "STORY",
  "LEARN",
];

// QWERTY keyboard layout
const KB_ROWS: string[][] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

// ==========================
// Utilities
// ==========================

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const dayIndex = (seed = new Date()) => {
  const start = new Date("2021-06-19T00:00:00Z"); // arbitrary epoch
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(
    (Date.UTC(seed.getFullYear(), seed.getMonth(), seed.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      msPerDay
  );
};

function evaluateGuess(answer: string, guess: string): LetterMark[] {
  // Both uppercase
  const len = answer.length;
  const result: LetterMark[] = Array(len);
  const counts: Record<string, number> = {};

  for (let i = 0; i < len; i++) {
    const a = answer[i];
    if (a === guess[i]) {
      result[i] = "correct";
    } else {
      counts[a] = (counts[a] || 0) + 1;
    }
  }
  for (let i = 0; i < len; i++) {
    if (result[i] === "correct") continue;
    const g = guess[i];
    if (counts[g] > 0) {
      result[i] = "present";
      counts[g]!--;
    } else {
      result[i] = "absent";
    }
  }
  return result;
}

function makeEmptyRows(wordLength: number, maxAttempts: number): GuessRow[] {
  return Array.from({ length: maxAttempts }, () => ({
    cells: Array.from({ length: wordLength }, () => ({ ch: "" })),
    submitted: false,
  }));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toEmoji(mark: LetterMark): string {
  return mark === "correct" ? "🟩" : mark === "present" ? "🟨" : "⬛";
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(text);
  // fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ==========================
// Component
// ==========================

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
    {children}
  </span>
);

const KeyButton: React.FC<{
  label: string;
  status: KeyStatus;
  onPress: (k: string) => void;
  wide?: boolean;
}> = ({ label, status, onPress, wide }) => (
  <button
    onClick={() => onPress(label)}
    className={`h-12 px-3 rounded-lg text-sm font-medium shadow-sm border transition active:scale-95 ${
      status === "unused"
        ? "bg-white border-gray-200"
        : status === "correct"
        ? "bg-green-600 text-white border-green-700"
        : status === "present"
        ? "bg-yellow-500 text-white border-yellow-600"
        : "bg-gray-500 text-white border-gray-600"
    } ${wide ? "col-span-2" : ""}`}
    aria-label={`Key ${label}`}
  >
    {label}
  </button>
);

const Wordle: React.FC<Props> = ({
  wordLength = 5,
  maxAttempts = 6,
  hardModeDefault = false,
  modeDefault = "daily",
  solutions,
  guesses,
}) => {
  const SOLS = React.useMemo(
    () =>
      (solutions && solutions.length ? solutions : DEFAULT_SOLUTIONS_5)
        .filter((w) => w.length === wordLength)
        .map((w) => w.toUpperCase()),
    [solutions, wordLength]
  );
  const ALLOWED = React.useMemo(
    () =>
      (guesses && guesses.length ? guesses : SOLS)
        .filter((w) => w.length === wordLength)
        .map((w) => w.toUpperCase()),
    [guesses, SOLS, wordLength]
  );

  const storageKey = (suffix: string) =>
    `wordle_${wordLength}x${maxAttempts}_${mode}_${suffix}`;

  // Settings
  const [mode, setMode] = React.useState<Mode>(modeDefault);
  const [hardMode, setHardMode] = React.useState<boolean>(hardModeDefault);

  // Game state
  const [answer, setAnswer] = React.useState<string>(() => {
    if (modeDefault === "daily") {
      const idx =
        ((dayIndex(new Date()) % SOLS.length) + SOLS.length) % SOLS.length;
      return SOLS[idx];
    }
    return randomChoice(SOLS);
  });

  const [rows, setRows] = React.useState<GuessRow[]>(() =>
    makeEmptyRows(wordLength, maxAttempts)
  );
  const [currentRow, setCurrentRow] = React.useState<number>(0);
  const [cursor, setCursor] = React.useState<number>(0); // within row 0..wordLength
  const [statusMsg, setStatusMsg] = React.useState<string>("");
  const [gameOver, setGameOver] = React.useState<boolean>(false);
  const [won, setWon] = React.useState<boolean>(false);

  // Keyboard status
  const [keyMap, setKeyMap] = React.useState<Record<string, KeyStatus>>({});

  // Stats
  const [stats, setStats] = React.useState<Stats>(() => {
    const raw = localStorage.getItem("wordle_stats");
    if (raw) return JSON.parse(raw) as Stats;
    return {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      distribution: {},
    };
  });

  // ----- Effects -----
  React.useEffect(() => {
    localStorage.setItem("wordle_stats", JSON.stringify(stats));
  }, [stats]);

  // Physical keyboard
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      const k = e.key.toUpperCase();
      if (k === "ENTER") {
        e.preventDefault();
        submitGuess();
        return;
      }
      if (k === "BACKSPACE") {
        e.preventDefault();
        del();
        return;
      }
      if (/^[A-Z]$/.test(k)) {
        typeLetter(k);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameOver, cursor, currentRow, rows]);

  // Mode change (daily/random) resets game
  React.useEffect(() => {
    newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, wordLength, maxAttempts]);

  // Hard mode toggle allowed only before first guess
  const toggleHard = () => {
    if (currentRow === 0 && cursor === 0) setHardMode((v) => !v);
  };

  // ----- Actions -----
  function newGame() {
    const nextAnswer =
      mode === "daily"
        ? SOLS[
            ((dayIndex(new Date()) % SOLS.length) + SOLS.length) % SOLS.length
          ]
        : randomChoice(SOLS);
    setAnswer(nextAnswer);
    setRows(makeEmptyRows(wordLength, maxAttempts));
    setCurrentRow(0);
    setCursor(0);
    setStatusMsg("");
    setGameOver(false);
    setWon(false);
    setKeyMap({});
  }

  function typeLetter(ch: string) {
    if (gameOver) return;
    if (cursor >= wordLength) return;
    setRows((prev) => {
      const next = prev.map((r) => ({
        ...r,
        cells: r.cells.map((c) => ({ ...c })),
      }));
      next[currentRow].cells[cursor].ch = ch;
      return next;
    });
    setCursor((c) => c + 1);
    setStatusMsg("");
  }

  function del() {
    if (gameOver) return;
    if (cursor <= 0) return;
    setRows((prev) => {
      const next = prev.map((r) => ({
        ...r,
        cells: r.cells.map((c) => ({ ...c })),
      }));
      next[currentRow].cells[cursor - 1].ch = "";
      return next;
    });
    setCursor((c) => Math.max(0, c - 1));
  }

  function currentGuessString(): string {
    return rows[currentRow].cells.map((c) => c.ch || "").join("");
  }

  function violatesHardMode(guess: string): string | null {
    if (!hardMode || currentRow === 0) return null;
    // All previously revealed greens must be in place; all previously revealed yellows must be included anywhere.
    const mustBeAt: Record<number, string> = {};
    const mustInclude: Set<string> = new Set();
    for (let r = 0; r < currentRow; r++) {
      const row = rows[r];
      const prevGuess = row.cells.map((c) => c.ch).join("");
      const marks = evaluateGuess(answer, prevGuess);
      for (let i = 0; i < marks.length; i++) {
        if (marks[i] === "correct") mustBeAt[i] = prevGuess[i];
        if (marks[i] === "present") mustInclude.add(prevGuess[i]);
      }
    }
    for (const iStr of Object.keys(mustBeAt)) {
      const i = Number(iStr);
      if (guess[i] !== mustBeAt[i])
        return `Hard mode: position ${i + 1} must be ${mustBeAt[i]}`;
    }
    for (const s of Array.from(mustInclude)) {
      if (!guess.includes(s)) return `Hard mode: must include letter ${s}`;
    }
    return null;
  }

  function submitGuess() {
    if (gameOver) return;
    const guess = currentGuessString();
    if (guess.length !== wordLength || !/^\p{L}+$/u.test(guess)) {
      setStatusMsg(`Enter ${wordLength} letters`);
      return;
    }
    const guessUpper = guess.toUpperCase();
    const hardErr = violatesHardMode(guessUpper);
    if (hardErr) {
      setStatusMsg(hardErr);
      return;
    }
    if (ALLOWED.length && !ALLOWED.includes(guessUpper)) {
      setStatusMsg("Not in word list");
      return;
    }

    const marks = evaluateGuess(answer, guessUpper);

    setRows((prev) => {
      const next = prev.map((r) => ({
        ...r,
        cells: r.cells.map((c) => ({ ...c })),
      }));
      for (let i = 0; i < wordLength; i++) {
        next[currentRow].cells[i] = { ch: guessUpper[i], mark: marks[i] };
      }
      next[currentRow].submitted = true;
      return next;
    });

    // update keyboard map (never downgrade: correct > present > absent > unused)
    setKeyMap((prev) => {
      const m = { ...prev } as Record<string, KeyStatus>;
      for (let i = 0; i < wordLength; i++) {
        const ch = guessUpper[i];
        const mark = marks[i];
        const cur = m[ch] || "unused";
        if (cur === "correct") continue;
        if (cur === "present" && mark === "absent") continue;
        m[ch] = mark;
      }
      return m;
    });

    if (marks.every((m) => m === "correct")) {
      // win
      setGameOver(true);
      setWon(true);
      setStatusMsg("You win!");
      setStats((s) => {
        const attempt = currentRow + 1;
        const dist = { ...s.distribution };
        dist[attempt] = (dist[attempt] || 0) + 1;
        return {
          played: s.played + 1,
          wins: s.wins + 1,
          currentStreak: s.currentStreak + 1,
          maxStreak: Math.max(s.maxStreak, s.currentStreak + 1),
          distribution: dist,
        };
      });
      return;
    }

    if (currentRow + 1 >= maxAttempts) {
      // lose
      setGameOver(true);
      setWon(false);
      setStatusMsg(`Answer: ${answer}`);
      setStats((s) => ({
        played: s.played + 1,
        wins: s.wins,
        currentStreak: 0,
        maxStreak: Math.max(s.maxStreak, s.currentStreak),
        distribution: s.distribution,
      }));
      return;
    }

    // advance to next row
    setCurrentRow((r) => r + 1);
    setCursor(0);
  }

  function shareResult() {
    const lines: string[] = [];
    for (let r = 0; r <= currentRow; r++) {
      if (!rows[r].submitted) continue;
      lines.push(rows[r].cells.map((c) => toEmoji(c.mark!)).join(""));
    }
    const header = `Wordle ${wordLength}/${maxAttempts} ${
      won ? currentRow + 1 : "X"
    }`;
    copyToClipboard(`${header}\n${lines.join("\n")}`).then(() =>
      setStatusMsg("Copied result to clipboard")
    );
  }

  // ==========================
  // Render
  // ==========================

  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Wordle (React + TypeScript)</h1>

      {/* Settings */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-600">Mode</span>
          <select
            className="px-2 py-1 border rounded-lg"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="daily">Daily</option>
            <option value="random">Random</option>
          </select>
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={hardMode} onChange={toggleHard} />
          <span>Hard mode</span>
        </label>
        <button
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
          onClick={newGame}
        >
          New game
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Pill>Len: {wordLength}</Pill>
          <Pill>Tries: {maxAttempts}</Pill>
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${wordLength}, minmax(2.6rem, 3rem))`,
        }}
        role="grid"
        aria-label={`Wordle grid ${wordLength} letters, ${maxAttempts} attempts`}
      >
        {rows.map((row, rIdx) =>
          row.cells.map((cell, cIdx) => {
            const isActive = rIdx === currentRow && !row.submitted;
            const mark = row.submitted ? cell.mark : undefined;
            const base =
              "h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-lg border text-xl font-bold";
            const color =
              mark === "correct"
                ? "bg-green-600 text-white border-green-700"
                : mark === "present"
                ? "bg-yellow-500 text-white border-yellow-600"
                : mark === "absent"
                ? "bg-gray-400 text-white border-gray-500"
                : "bg-white border-gray-300";
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`${base} ${color}`}
                aria-label={`row ${rIdx + 1} col ${cIdx + 1}`}
              >
                {cell.ch}
                {isActive && cIdx === cursor && (
                  <span className="w-[2px] h-6 bg-indigo-500 absolute animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Status */}
      <div className="min-h-[1.5rem] text-sm text-gray-700" aria-live="polite">
        {statusMsg}
      </div>

      {/* Keyboard */}
      <div className="grid gap-2">
        {KB_ROWS.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-10 gap-2 justify-items-center"
          >
            {idx === 2 && (
              <KeyButton
                label="ENTER"
                status="unused"
                onPress={() => submitGuess()}
                wide
              />
            )}
            {row.map((k) => (
              <KeyButton
                key={k}
                label={k}
                status={keyMap[k] || "unused"}
                onPress={(key) => typeLetter(key)}
              />
            ))}
            {idx === 2 && (
              <KeyButton
                label="DEL"
                status="unused"
                onPress={() => del()}
                wide
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer actions & stats */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
          onClick={shareResult}
          disabled={!gameOver}
        >
          Share
        </button>
        <Pill>Played: {stats.played}</Pill>
        <Pill>
          Win%:{" "}
          {stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%
        </Pill>
        <Pill>Streak: {stats.currentStreak}</Pill>
        <Pill>Max: {stats.maxStreak}</Pill>
      </div>

      <footer className="text-xs text-gray-500 mt-2 text-center max-w-xl">
        Type‑safe • Hard mode • Daily/Random • Keyboard & on‑screen keys • Stats
        & share • Duplicate‑letter‑aware marking
      </footer>
    </div>
  );
};

export default Wordle;
