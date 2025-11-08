import { useState } from "react";

type Board = "X" | "O" | null;
type Player = Exclude<Board, null>;

const directions = [
  { dr: 1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

const initBoards = (size: number) => new Array<Board>(size * size).fill(null);

const getIndex = (row: number, col: number, size: number) => row * size + col;

const isInBound = (row: number, col: number, size: number) =>
  row >= 0 && row < size && col >= 0 && col < size;

const checkSuccess = (
  boards: Board[],
  size: number,
  winLength: number
): { winner: Player; lines: number[] } | undefined => {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cellVal = boards[getIndex(row, col, size)];
      if (!cellVal) {
        continue;
      }
      for (const direction of directions) {
        const lines: number[] = [getIndex(row, col, size)];
        const { dr, dc } = direction;
        let nr = row + dr;
        let nc = col + dc;
        while (
          isInBound(nr, nc, size) &&
          boards[getIndex(nr, nc, size)] === cellVal &&
          lines.length < winLength
        ) {
          lines.push(getIndex(nr, nc, size));
          nr += dr;
          nc += dc;
        }
        if (lines.length === winLength) {
          return {
            winner: cellVal,
            lines: lines,
          };
        }
      }
    }
  }
};

interface Snapshot {
  board: Board[];
  player?: Player;
  lastMove?: number;
}

interface TicTacToeProps {
  size?: number;
  winLength?: number;
}

const TicTacToe = ({ size = 3, winLength = 3 }: TicTacToeProps) => {
  const [boards, setBoards] = useState<Board[]>(() => initBoards(size));
  const [player, setPlayer] = useState<Player>("X");
  const [winner, setWinner] = useState<Player | null>(null);
  const [histories, setHistories] = useState<Snapshot[]>(() => [
    { board: initBoards(size) },
  ]);

  const onClickCell = (index: number) => {
    if (boards[index] !== null || winner) {
      return;
    }
    const newBoards = [...boards];
    newBoards[index] = player;
    const newHistory: Snapshot = {
      board: newBoards,
      lastMove: index,
      player: player,
    };

    const successPlayer = checkSuccess(newBoards, size, winLength);
    if (successPlayer) {
      const { winner } = successPlayer;
      setWinner(winner);
    }
    setBoards(newBoards);
    setHistories([...histories, newHistory]);
    setPlayer(player === "X" ? "O" : "X");
  };

  const onClickHistory = (history: Snapshot, index: number) => {
    setBoards(history.board);
    if (history.player) {
      setPlayer(history.player);
    } else {
      setPlayer("X");
    }
    const newHistories = histories.slice(0, index + 1);
    setHistories(newHistories);
    setWinner(null);
  };

  const percentage = 100 / size;
  const percentageWidth = parseFloat(percentage.toFixed(2));

  return (
    <div className="w-[100vw] flex flex-col items-center justify-center mt-4 gap-2">
      <div>
        <div>Current player: {player}</div>
        {winner ? <div>Winner player: {winner}</div> : null}
      </div>
      <div className="flex flex-row items-start">
        <div className="flex flex-wrap w-[50%] gap-2">
          {boards.map((board, index) => (
            <button
              className={`basis-[calc(${percentageWidth}%-8px)] border border-gray-500 rounded-sm p-2 min-h-12`}
              key={index}
              onClick={() => onClickCell(index)}
            >
              {board}
            </button>
          ))}
        </div>
        <div className="w-[50%] flex flex-col">
          {histories.map((history, index) => {
            return (
              <button
                key={index}
                className="border border-gray-500 p-2"
                onClick={() => onClickHistory(history, index)}
              >
                <p>
                  Step {index} - Move {history.lastMove}
                </p>
                {history.player}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;
