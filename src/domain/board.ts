import type { Board, Cell, Goal, GoalProgress } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  // Bun provides crypto.randomUUID; fall back to a random string.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(value);
  return Math.min(max, Math.max(min, n));
}

function hashStringToInt(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashStringToInt(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function isGoalComplete(goal: Goal): boolean {
  switch (goal.trackingMode) {
    case "binary":
      return goal.progress.binary?.done === true;
    case "percent":
      return (goal.progress.percent?.value ?? 0) === 100;
    case "count": {
      const current = goal.progress.count?.current ?? 0;
      const target = goal.progress.count?.target ?? 0;
      if (target <= 0) return false;
      return current >= target;
    }
    default: {
      // Exhaustive check
      const _exhaustive: never = goal.trackingMode;
      return _exhaustive;
    }
  }
}

export function toggleGoalDone(goal: Goal, done: boolean): void {
  goal.trackingMode = "binary";
  goal.progress = {
    binary: { done, doneAt: done ? nowIso() : undefined },
  };
  goal.updatedAt = nowIso();
}

export function setGoalPercent(goal: Goal, value: number): void {
  goal.trackingMode = "percent";
  goal.progress = {
    percent: { value: clampInt(value, 0, 100) },
  };
  goal.updatedAt = nowIso();
}

export function setGoalCount(
  goal: Goal,
  input: { current: number; target: number; unit?: string },
): void {
  const target = clampInt(input.target, 1, Number.MAX_SAFE_INTEGER);
  const current = clampInt(input.current, 0, Number.MAX_SAFE_INTEGER);

  goal.trackingMode = "count";
  goal.progress = {
    count: { current, target, unit: input.unit },
  };
  goal.updatedAt = nowIso();
}

function createEmptyGoal(): Goal {
  const now = nowIso();
  return {
    id: makeId(),
    title: "",
    trackingMode: "binary",
    progress: { binary: { done: false } },
    priority: "medium",
    difficulty: "medium",
    reminderCadence: "none",
    subtasks: [],
    checkIns: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDraftBoard(input: { year: number }): Board {
  const now = nowIso();
  return {
    schemaVersion: 1,
    year: input.year,
    status: "draft",
    seed: makeId(),
    goals: Array.from({ length: 24 }, () => createEmptyGoal()),
    cellMap: null,
    createdAt: now,
  };
}

function assertAllGoalTitlesFilled(goals: Goal[]): void {
  const missing = goals.filter((g) => g.title.trim().length === 0).length;
  if (missing > 0) {
    throw new Error(
      `All 24 goals require titles before generating (missing: ${missing}).`,
    );
  }
}

export function generateActiveBoard(draft: Board): Board {
  if (draft.status !== "draft") {
    throw new Error("Board has already been generated.");
  }

  assertAllGoalTitlesFilled(draft.goals);

  const shuffledIds = seededShuffle(
    draft.goals.map((g) => g.id),
    draft.seed,
  );

  const cells: Cell[] = new Array(25);
  let goalIndex = 0;

  for (let cellIndex = 0; cellIndex < 25; cellIndex++) {
    if (cellIndex === 12) {
      cells[cellIndex] = { type: "free" };
      continue;
    }

    const goalId = shuffledIds[goalIndex];
    if (!goalId) throw new Error("Internal error generating board.");

    cells[cellIndex] = { type: "goal", goalId };
    goalIndex++;
  }

  return {
    ...draft,
    status: "active",
    activatedAt: nowIso(),
    cellMap: cells,
  };
}

export function normalizeProgress(goal: Goal): GoalProgress {
  // Optional helper for future use.
  switch (goal.trackingMode) {
    case "binary":
      return { binary: { done: goal.progress.binary?.done === true } };
    case "percent":
      return { percent: { value: clampInt(goal.progress.percent?.value ?? 0, 0, 100) } };
    case "count": {
      const target = clampInt(goal.progress.count?.target ?? 1, 1, Number.MAX_SAFE_INTEGER);
      const current = clampInt(goal.progress.count?.current ?? 0, 0, Number.MAX_SAFE_INTEGER);
      return { count: { current, target, unit: goal.progress.count?.unit } };
    }
  }
}
