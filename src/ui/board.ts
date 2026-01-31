import { el } from "./el.ts";
import type { Board } from "../domain/types.ts";
import { goalById } from "../state/store.ts";
import { getCompletedLines } from "../domain/bingo.ts";

export function renderActive(board: Board): HTMLElement {
  const container = el("section", { class: "section" });

  if (!board.cellMap) {
    container.append(el("p", { class: "muted" }, ["Board is missing cell map."]));
    return container;
  }

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

  const completedLines = getCompletedLines(completionMap, {
    freeCenterComplete: true,
  });

  container.append(
    el("div", { class: "stats" }, [
      el("h2", {}, ["Board"]),
      el("p", { class: "muted" }, [
        `Bingos: ${completedLines.length} (${completedLines.join(", ") || "none"})`,
      ]),
    ]),
  );

  const grid = el("div", { class: "grid", role: "grid" });

  for (let i = 0; i < 25; i++) {
    const cell = board.cellMap[i];
    if (!cell) continue;

    if (cell.type === "free") {
      grid.append(
        el(
          "div",
          {
            class: "tile tile--free",
            role: "gridcell",
            "aria-label": "Free tile (complete)",
          },
          [el("div", { class: "tile__title" }, ["Free"]), el("div", { class: "tile__meta" }, ["Complete"])],
        ),
      );
      continue;
    }

    const goal = goalById(board, cell.goalId);
    const title = goal?.title ?? "(missing goal)";
    const complete = goal ? isGoalComplete(goal) : false;

    const meta = goal
      ? goal.trackingMode === "binary"
        ? complete
          ? "Done"
          : "Not done"
        : goal.trackingMode === "percent"
          ? `${goal.progress.percent?.value ?? 0}%`
          : `${goal.progress.count?.current ?? 0}/${goal.progress.count?.target ?? 0}`
      : "";

    const button = el(
      "button",
      {
        class: `tile tile--button ${complete ? "tile--complete" : ""}`,
        type: "button",
        role: "gridcell",
        "aria-label": `${title}. ${meta}.`,
      },
      [
        el("div", { class: "tile__title" }, [title]),
        el("div", { class: "tile__meta" }, [meta]),
      ],
    ) as HTMLButtonElement;

    button.addEventListener("click", () => {
      // Fire custom event for main to handle selection
      window.dispatchEvent(new CustomEvent("select-goal", { detail: { goalId: cell.goalId } }));
    });

    grid.append(button);
  }

  container.append(grid);

  return container;
}

function isGoalComplete(goal: any): boolean {
  if (!goal) return false;
  if (goal.trackingMode === "binary") return goal.progress.binary?.done === true;
  if (goal.trackingMode === "percent") return goal.progress.percent?.value === 100;
  if (goal.trackingMode === "count") {
    const current = goal.progress.count?.current ?? 0;
    const target = goal.progress.count?.target ?? 1;
    return current >= target;
  }
  return false;
}
