import { el } from "./el.ts";
import type { Board } from "../domain/types.ts";
import { goalById } from "../state/store.ts";

export function renderGoalDetail(board: Board, goalId: string): HTMLElement | null {
  const goal = goalById(board, goalId);
  if (!goal) {
    return el("div", { class: "detail" }, [
      el("p", { class: "muted" }, ["Goal not found."]),
    ]);
  }

  const titleInput = el("input", {
    class: "input",
    value: goal.title,
    // Events will be wired by main
  }) as HTMLInputElement;

  const modeSelect = el("select", { class: "select" }, [
    el("option", { value: "binary" }, ["✅ Just get it done"]),
    el("option", { value: "percent" }, ["📊 Track progress (0-100%)"]),
    el("option", { value: "count" }, ["🔢 Count milestones"]),
  ]) as HTMLSelectElement;

  modeSelect.value = goal.trackingMode;

  const progressControls = el("div", { class: "progress" });

  if (goal.trackingMode === "binary") {
    const checkbox = el("input", {
      type: "checkbox",
    }) as HTMLInputElement;
    checkbox.checked = goal.progress.binary?.done === true;

    progressControls.append(
      el("label", { class: "checkbox" }, [checkbox, " Done"]),
    );
  }

  if (goal.trackingMode === "percent") {
    const range = el("input", {
      type: "range",
      min: "0",
      max: "100",
      value: String(goal.progress.percent?.value ?? 0),
    }) as HTMLInputElement;

    const value = el("span", { class: "badge" }, [
      `${goal.progress.percent?.value ?? 0}%`,
    ]);

    progressControls.append(el("div", { class: "row" }, [range, value]));
  }

  if (goal.trackingMode === "count") {
    const current = el("input", {
      class: "input input--number",
      type: "number",
      min: "0",
      value: String(goal.progress.count?.current ?? 0),
    }) as HTMLInputElement;

    const target = el("input", {
      class: "input input--number",
      type: "number",
      min: "1",
      value: String(goal.progress.count?.target ?? 1),
    }) as HTMLInputElement;

    progressControls.append(
      el("div", { class: "row" }, [
        el("label", { class: "label-inline" }, ["Current", current]),
        el("label", { class: "label-inline" }, ["Target", target]),
      ]),
    );
  }

  const priority = el("select", { class: "select" }, [
    el("option", { value: "low" }, ["Low"]),
    el("option", { value: "medium" }, ["Medium"]),
    el("option", { value: "high" }, ["High"]),
  ]) as HTMLSelectElement;
  priority.value = goal.priority;

  const difficulty = el("select", { class: "select" }, [
    el("option", { value: "easy" }, ["Easy"]),
    el("option", { value: "medium" }, ["Medium"]),
    el("option", { value: "hard" }, ["Hard"]),
  ]) as HTMLSelectElement;
  difficulty.value = goal.difficulty;

  const why = el("textarea", {
    class: "textarea",
    placeholder: "Why it matters (optional)",
  }) as HTMLTextAreaElement;
  why.value = goal.why ?? "";

  const cadenceSelect = el("select", { class: "select" }, [
    el("option", { value: "none" }, ["No reminders"]),
    el("option", { value: "weekly" }, ["Weekly"]),
    el("option", { value: "monthly" }, ["Monthly"]),
    el("option", { value: "quarterly" }, ["Quarterly"]),
    el("option", { value: "custom" }, ["Custom days"]),
  ]) as HTMLSelectElement;

  const customDays = el("input", {
    class: "input input--number",
    type: "number",
    min: "1",
    value: "7",
  }) as HTMLInputElement;

  const existingCadence = goal.reminderCadence;
  if (typeof existingCadence === "string") {
    cadenceSelect.value = existingCadence;
  } else {
    cadenceSelect.value = "custom";
    customDays.value = String(existingCadence.customDays);
  }

  const subtasks = el("div", { class: "subtasks" }, [
    el("h3", {}, ["Subtasks"]),
  ]);

  const subtaskList = el("div", { class: "stack" });
  for (const subtask of goal.subtasks) {
    const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
    cb.checked = subtask.done;

    subtaskList.append(
      el("label", { class: "checkbox" }, [cb, ` ${subtask.title}`]),
    );
  }

  const subtaskInput = el("input", {
    class: "input",
    placeholder: "Add a subtask",
  }) as HTMLInputElement;

  const addSubtask = el(
    "button",
    { class: "button", type: "button" },
    ["Add"],
  ) as HTMLButtonElement;

  const checkins = el("div", { class: "checkins" }, [
    el("h3", {}, ["Check-ins"]),
  ]);

  const checkinList = el("div", { class: "stack" });
  for (const checkin of goal.checkIns) {
    checkinList.append(
      el("div", { class: "checkin" }, [
        el("div", { class: "checkin__date" }, [checkin.date.slice(0, 10)]),
        el("div", { class: "checkin__note" }, [checkin.note]),
      ]),
    );
  }

  const checkinInput = el("textarea", {
    class: "textarea",
    placeholder: "Add a note",
  }) as HTMLTextAreaElement;

  const addCheckin = el(
    "button",
    { class: "button", type: "button" },
    ["Add note"],
  ) as HTMLButtonElement;

  const detail = el("section", { class: "detail" }, [
    el("h2", {}, ["Goal"]),
    el("div", { class: "stack" }, [
      el("label", { class: "label" }, ["Title", titleInput]),
      el("label", { class: "label" }, ["Tracking", modeSelect]),
      progressControls,
      el("div", { class: "row" }, [
        el("label", { class: "label-inline" }, ["Priority", priority]),
        el("label", { class: "label-inline" }, ["Difficulty", difficulty]),
      ]),
      el("div", { class: "row" }, [
        el("label", { class: "label-inline" }, ["Reminder cadence", cadenceSelect]),
        cadenceSelect.value === "custom"
          ? el("label", { class: "label-inline" }, ["Days", customDays])
          : el("span", { class: "muted" }, [" "]),
      ]),
      why,
    ]),
    subtasks,
    subtaskList,
    el("div", { class: "row" }, [subtaskInput, addSubtask]),
    checkins,
    checkinList,
    el("div", { class: "row" }, [checkinInput, addCheckin]),
  ]);

  return detail;
}