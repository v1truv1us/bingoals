import { el } from "./el.ts";
import type { Board } from "../domain/types.ts";

export function renderDraft(board: Board): HTMLElement {
  const container = el("section", { class: "section" }, [
    el("h2", {}, ["Create your 24 goals"]),
    el(
      "p",
      { class: "muted" },
      [
        "Fill all 24 goal titles, then generate your locked bingo board. The center tile is Free.",
      ],
    ),
  ]);

  const list = el("div", { class: "goal-list" });

  // Help text positioned right before goal inputs
  const helpText = el(
    "div",
    { class: "help-text" },
    [
      el("h4", {}, ["🎯 How would you like to track your goals?"]),
      el("ul", {}, [
        el("li", {}, ["✅ ", el("strong", {}, ["Just get it done"]), " - Perfect for simple yes/no goals like 'Read a book' or 'Go to the gym'"]),
        el("li", {}, ["📊 ", el("strong", {}, ["Track progress (0-100%)"]), " - Great for ongoing goals like 'Learn guitar' or 'Save $1000'"]),
        el("li", {}, ["🔢 ", el("strong", {}, ["Count milestones"]), " - Ideal for quantifiable goals like 'Complete 10 projects' or 'Run 50 miles'"]),
      ]),
    ],
  );

  container.append(helpText); // Add help text right before the goal list

  for (let i = 0; i < board.goals.length; i++) {
    const goal = board.goals[i];

    const titleId = `goal-title-${i}`;
    const modeId = `goal-mode-${i}`;

    const titleInput = el("input", {
      id: titleId,
      class: "input",
      value: goal.title,
      placeholder: `Goal ${i + 1}`,
    }) as HTMLInputElement;

    const modeSelect = el("select", { id: modeId, class: "select" }, [
      el("option", { value: "binary" }, ["✅ Just get it done"]),
      el("option", { value: "percent" }, ["📊 Track progress (0-100%)"]),
      el("option", { value: "count" }, ["🔢 Count milestones"]),
    ]) as HTMLSelectElement;

    modeSelect.value = goal.trackingMode;

    list.append(
      el("div", { class: "goal-row" }, [
        el("label", { class: "label", for: titleId }, [`Goal ${i + 1}`]),
        el("div", { class: "goal-row__inputs" }, [modeSelect, titleInput]),
      ]),
    );
  }

  container.append(list);

  const generateBtn = el(
    "button",
    { id: "generate-btn", class: "button button--primary", type: "button" },
    ["Generate board"],
  ) as HTMLButtonElement;

  const updateGenerateDisabled = () => {
    const allFilled = board.goals.every((g) => g.title.trim().length > 0);
    generateBtn.disabled = !allFilled;
  };

  updateGenerateDisabled();

  container.append(el("div", { class: "actions" }, [generateBtn]));

  return container;
}