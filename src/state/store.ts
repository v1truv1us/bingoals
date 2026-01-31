import { createDraftBoard, isGoalComplete } from "../domain/board.ts";
import { getCompletedLines } from "../domain/bingo.ts";
import type { Board, Goal } from "../domain/types.ts";
import { getBoard, saveBoard } from "../tauri/board.ts";

export type AppState = {
  board: Board;
  selectedGoalId: string | null;
};

let state: AppState | null = null;
let saveTimeout: number | null = null;

export function getState(): AppState | null {
  return state;
}

export function setState(newState: AppState): void {
  state = newState;
}



export async function loadOrCreateBoard(): Promise<void> {
  const stored = await getBoard();
  const board = stored && isBoard(stored)
    ? (stored as Board)
    : createDraftBoard({ year: new Date().getFullYear() });

  setState({ board, selectedGoalId: null });

  // Ensure we persist an initial board for resume-on-restart behavior.
  await saveBoard(state!.board);
}

export async function scheduleSave(): Promise<void> {
  if (!state) return;

  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    if (!state) return;
    await saveBoard(state.board);
  }, 250);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoard(value: unknown): value is Board {
  if (!isPlainObject(value)) return false;
  return (
    value["schemaVersion"] === 1 &&
    typeof value["year"] === "number" &&
    (value["status"] === "draft" || value["status"] === "active") &&
    typeof value["seed"] === "string" &&
    Array.isArray(value["goals"])
  );
}

export function goalById(board: Board, goalId: string): Goal | undefined {
  return board.goals.find((g) => g.id === goalId);
}

export function getBingoLines(board: Board): string[] {
  if (!board.cellMap) return [];

  const completionMap: boolean[] = new Array(25).fill(false);

  for (let i = 0; i < 25; i++) {
    const cell = board.cellMap[i];
    if (!cell) continue;

    if (cell.type === "free") {
      completionMap[i] = true;
      continue;
    }

    const goal = goalById(board, cell.goalId);
    completionMap[i] = goal ? isGoalComplete(goal) : false;
  }

  return getCompletedLines(completionMap, {
    freeCenterComplete: true,
  });
}