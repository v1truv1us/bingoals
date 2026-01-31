import { describe, expect, it } from "vitest";

import { getCompletedLines, type LineId } from "./bingo.ts";

function makeCompletionMap(completedIndices: number[]): boolean[] {
  const map = new Array(25).fill(false);
  for (const idx of completedIndices) map[idx] = true;
  return map;
}

describe("domain/bingo", () => {
  it("detects a completed row", () => {
    // Row 0: indices 0..4
    const completed = makeCompletionMap([0, 1, 2, 3, 4]);
    const lines = getCompletedLines(completed);

    expect(lines).toContain<LineId>("row-0");
  });

  it("detects diagonals and counts free center as complete", () => {
    // Main diagonal: 0,6,12,18,24
    // Do not mark 12 to simulate free-center completion.
    const completed = makeCompletionMap([0, 6, 18, 24]);

    const lines = getCompletedLines(completed, { freeCenterComplete: true });
    expect(lines).toContain<LineId>("diag-main");
  });

  it("does not award bingo if a line is incomplete", () => {
    const completed = makeCompletionMap([0, 1, 2, 3]);
    const lines = getCompletedLines(completed);

    expect(lines).not.toContain<LineId>("row-0");
  });
});
