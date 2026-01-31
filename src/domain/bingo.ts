export type LineId =
  | `row-${0 | 1 | 2 | 3 | 4}`
  | `col-${0 | 1 | 2 | 3 | 4}`
  | "diag-main"
  | "diag-anti";

export type BingoOptions = {
  freeCenterComplete?: boolean;
};

function getLineIndices(): Array<{ id: LineId; indices: number[] }> {
  const lines: Array<{ id: LineId; indices: number[] }> = [];

  for (let row = 0 as 0 | 1 | 2 | 3 | 4; row < 5; row++) {
    const start = row * 5;
    lines.push({
      id: `row-${row}`,
      indices: [start, start + 1, start + 2, start + 3, start + 4],
    });
  }

  for (let col = 0 as 0 | 1 | 2 | 3 | 4; col < 5; col++) {
    lines.push({
      id: `col-${col}`,
      indices: [col, col + 5, col + 10, col + 15, col + 20],
    });
  }

  lines.push({ id: "diag-main", indices: [0, 6, 12, 18, 24] });
  lines.push({ id: "diag-anti", indices: [4, 8, 12, 16, 20] });

  return lines;
}

export function getCompletedLines(
  completionMap: boolean[],
  options: BingoOptions = {},
): LineId[] {
  if (completionMap.length !== 25) {
    throw new Error(`Expected completion map length 25, got ${completionMap.length}`);
  }

  const freeCenterComplete = options.freeCenterComplete ?? true;

  const isCompleteAt = (idx: number): boolean => {
    if (idx === 12 && freeCenterComplete) return true;
    return completionMap[idx] === true;
  };

  const completed: LineId[] = [];
  for (const line of getLineIndices()) {
    if (line.indices.every(isCompleteAt)) {
      completed.push(line.id);
    }
  }

  return completed;
}
