import { describe, expect, it } from "vitest";

import type { Cell } from "./types";

import {
  createDraftBoard,
  generateActiveBoard,
  isGoalComplete,
  setGoalPercent,
  setGoalCount,
  toggleGoalDone,
} from "./board.ts";

describe("domain/board", () => {
  it("requires 24 non-empty titles before generation", () => {
    const board = createDraftBoard({ year: 2026 });

    // Arrange: only fill 23 titles
    for (let i = 0; i < 23; i++) {
      board.goals[i].title = `Goal ${i + 1}`;
    }

    // Act + Assert
    expect(() => generateActiveBoard(board)).toThrow(/24/i);
  });

  it("generates a 25-cell map with free center", () => {
    const board = createDraftBoard({ year: 2026 });
    for (let i = 0; i < 24; i++) board.goals[i].title = `Goal ${i + 1}`;

    const active = generateActiveBoard(board);

    expect(active.status).toBe("active");
    expect(active.cellMap).not.toBeNull();
    const cellMap = active.cellMap!;
    expect(cellMap).toHaveLength(25);
    expect(cellMap[12]).toEqual({ type: "free" });

    const goalCells = cellMap.filter((c: Cell) => c.type === "goal");
    expect(goalCells).toHaveLength(24);
  });

  it("binary goals complete when done=true", () => {
    const board = createDraftBoard({ year: 2026 });
    board.goals[0].title = "Run a marathon";

    expect(isGoalComplete(board.goals[0])).toBe(false);

    toggleGoalDone(board.goals[0], true);
    expect(isGoalComplete(board.goals[0])).toBe(true);
  });

  it("percent goals complete at 100 and clamp 0..100", () => {
    const board = createDraftBoard({ year: 2026 });
    board.goals[0].title = "Learn Swift";
    board.goals[0].trackingMode = "percent";

    setGoalPercent(board.goals[0], 120);
    expect(board.goals[0].progress.percent?.value).toBe(100);
    expect(isGoalComplete(board.goals[0])).toBe(true);

    setGoalPercent(board.goals[0], -10);
    expect(board.goals[0].progress.percent?.value).toBe(0);
    expect(isGoalComplete(board.goals[0])).toBe(false);
  });

  it("count goals complete when current >= target", () => {
    const board = createDraftBoard({ year: 2026 });
    board.goals[0].title = "Read books";
    board.goals[0].trackingMode = "count";

    setGoalCount(board.goals[0], { current: 0, target: 12 });
    expect(isGoalComplete(board.goals[0])).toBe(false);

    setGoalCount(board.goals[0], { current: 12, target: 12 });
    expect(isGoalComplete(board.goals[0])).toBe(true);

    setGoalCount(board.goals[0], { current: 13, target: 12 });
    expect(isGoalComplete(board.goals[0])).toBe(true);
  });
});
