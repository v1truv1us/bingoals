export type TrackingMode = "binary" | "percent" | "count";

export type Priority = "low" | "medium" | "high";
export type Difficulty = "easy" | "medium" | "hard";

export type ReminderCadence =
  | "none"
  | "weekly"
  | "monthly"
  | "quarterly"
  | { customDays: number };

export type GoalProgress = {
  binary?: { done: boolean; doneAt?: string };
  percent?: { value: number };
  count?: { current: number; target: number; unit?: string };
};

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
  doneAt?: string;
};

export type CheckIn = {
  id: string;
  date: string;
  note: string;
};

export type Goal = {
  id: string;
  title: string;
  trackingMode: TrackingMode;
  progress: GoalProgress;
  priority: Priority;
  difficulty: Difficulty;
  why?: string;
  reminderCadence: ReminderCadence;
  subtasks: Subtask[];
  checkIns: CheckIn[];
  createdAt: string;
  updatedAt: string;
};

export type Cell = { type: "free" } | { type: "goal"; goalId: string };

export type BoardStatus = "draft" | "active";

export type Board = {
  schemaVersion: 1;
  year: number;
  status: BoardStatus;
  seed: string;
  goals: Goal[];
  cellMap: Cell[] | null;
  createdAt: string;
  activatedAt?: string;
};
