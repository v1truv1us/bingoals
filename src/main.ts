import { el } from "./ui/el.ts";
import { generateActiveBoard, toggleGoalDone, setGoalCount, setGoalPercent } from "./domain/board.ts";
import { getState, loadOrCreateBoard, scheduleSave, setState } from "./state/store.ts";
import { resetBoard, saveBoard } from "./tauri/board.ts";
import type { Board, BoardStatus } from "./domain/types.ts";
import { invoke } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { openModal, handleEscKey } from "./ui/modal.ts";

// URL opening utility that works on both desktop and mobile
async function openUrl(url: string): Promise<void> {
  try {
    // Try Tauri's invoke first (works on desktop)
    await invoke("open_url", { url });
  } catch (error) {
    // Fallback for mobile - open in the webview or system browser
    if (typeof window !== 'undefined' && window.location) {
      // For mobile Tauri or web environment
      window.open(url, "_blank");
    }
  }
}

const root = document.querySelector<HTMLElement>("#app")!;

function nowIso(): string {
  return new Date().toISOString();
}

function goalById(board: Board, goalId: string) {
  return board.goals.find((g) => g.id === goalId);
}

function render() {
  const state = getState();
  if (!state) return;

  root.replaceChildren(
    el("header", { class: "header" }, [
      el("div", { class: "header__title" }, [
        el("h1", {}, ["Bingoals"]),
        el("p", { class: "muted" }, [`Year ${state.board.year}`]),
      ]),
      el("div", { class: "header__actions" }, [
        el(
          "button",
          { 
            class: "button button--secondary", 
            type: "button",
            id: "privacy-btn"
          },
          ["Privacy"],
        ),
        el(
          "button",
          { 
            class: "button button--secondary", 
            type: "button",
            id: "support-btn"
          },
          ["Support"],
        ),
        el(
          "button",
          { 
            class: "button button--primary", 
            type: "button",
            id: "export-btn"
          },
          ["Export"],
        ),
        el(
          "button",
          { class: "button button--danger", type: "button" },
          ["Reset"],
        ),
      ]),
    ]),
  );

  const resetBtn = root.querySelector<HTMLButtonElement>(
    ".button--danger",
  );
  resetBtn?.addEventListener("click", async () => {
    const ok = await confirm(
      "Reset clears your board and progress. Continue?",
      { title: "Reset Board", kind: "warning" }
    );
    if (!ok) return;

    await resetBoard();
    const newState = {
      board: { ...state.board, status: "draft" as BoardStatus, goals: state.board.goals.map(g => ({ ...g, progress: {}, subtasks: [], checkIns: [] })) },
      selectedGoalId: null,
    };
    setState(newState);
    await saveBoard(newState.board);
    render();
  });

  // Add event listeners for privacy and support buttons
  const privacyBtn = root.querySelector<HTMLButtonElement>("#privacy-btn");
  privacyBtn?.addEventListener("click", async () => {
    await openUrl("https://bingoals.app/privacy");
  });

  const supportBtn = root.querySelector<HTMLButtonElement>("#support-btn");
  supportBtn?.addEventListener("click", async () => {
    await openUrl("mailto:support@bingoals.app");
  });

  const exportBtn = root.querySelector<HTMLButtonElement>("#export-btn");
  exportBtn?.addEventListener("click", exportData);

  if (state.board.status === "draft") {
    import("./ui/setup.ts").then(({ renderDraft }) => {
      root.append(renderDraft(state.board));
      // Small delay to ensure DOM is ready
      setTimeout(() => wireDraftEvents(state.board), 0);
    });
  } else {
    import("./ui/board.ts").then(({ renderActive }) => {
      root.append(renderActive(state.board));
    });
  }
}

function wireDraftEvents(board: Board) {
  const generateBtn = document.querySelector<HTMLButtonElement>("#generate-btn");
  if (!generateBtn) {
    setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>("#generate-btn");
      if (btn) attachClickListener(btn, board);
    }, 100);
    return;
  }
  attachClickListener(generateBtn, board);
}

function attachClickListener(generateBtn: HTMLButtonElement, board: Board) {
  // Initialize button state by calling the setup.ts function
  const allFilled = board.goals.every((g) => g.title.trim().length > 0);
  generateBtn.disabled = !allFilled;

  // Attach click listener for generate button
  generateBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const ok = await confirm(
      "This will shuffle your goals once and lock board layout. Continue?",
      { title: "Generate Board", kind: "info" }
    );
    if (!ok) {
      return;
    }

    try {
      const state = getState()!;
      const newBoard = generateActiveBoard(state.board);

      setState({ board: newBoard, selectedGoalId: null });

      await saveBoard(newBoard);

      render();
    } catch (error) {
      console.error("[Generate Board] Error during generation:", error);
      await message(`Failed to generate board: ${String(error)}`, { title: "Error", kind: "error" });
    }
  });

  // Wire title inputs
  for (let i = 0; i < board.goals.length; i++) {
    const titleInput = document.querySelector<HTMLInputElement>(`#goal-title-${i}`);
    if (titleInput) {
      titleInput.addEventListener("input", () => {
        const goal = board.goals[i];
        goal.title = titleInput.value;
        goal.updatedAt = nowIso();
        scheduleSave();
        // Update generate button state
        const generateBtn = document.querySelector<HTMLButtonElement>("#generate-btn");
        if (generateBtn) {
          const allFilled = board.goals.every((g) => g.title.trim().length > 0);
          generateBtn.disabled = !allFilled;
        }
      });
    }

    const modeSelect = document.querySelector<HTMLSelectElement>(`#goal-mode-${i}`);
    if (modeSelect) {
      modeSelect.addEventListener("change", () => {
        const goal = board.goals[i];
        const mode = modeSelect.value as "binary" | "percent" | "count";
        if (mode === "binary") toggleGoalDone(goal, false);
        if (mode === "percent") setGoalPercent(goal, 0);
        if (mode === "count") setGoalCount(goal, { current: 0, target: 1 });
        scheduleSave();
        render();
      });
    }
  }
}

function wireModalGoalEvents(board: Board, goalId: string) {
  const goal = goalById(board, goalId);
  if (!goal) return;

  const titleInput = document.querySelector<HTMLInputElement>(".modal .input");
  if (titleInput) {
    titleInput.value = goal.title;
    titleInput.addEventListener("input", () => {
      goal.title = titleInput.value;
      goal.updatedAt = nowIso();
      scheduleSave();
    });
  }

  const modeSelect = document.querySelector<HTMLSelectElement>(".modal .select");
  if (modeSelect) {
    modeSelect.value = goal.trackingMode;
    modeSelect.addEventListener("change", () => {
      const mode = modeSelect.value as "binary" | "percent" | "count";
      if (mode === "binary") toggleGoalDone(goal, false);
      if (mode === "percent") setGoalPercent(goal, 0);
      if (mode === "count") setGoalCount(goal, { current: 0, target: 1 });
      scheduleSave();
    });
  }

  const checkbox = document.querySelector<HTMLInputElement>('.modal input[type="checkbox"]');
  if (checkbox) {
    checkbox.checked = goal.progress.binary?.done === true;
    checkbox.addEventListener("change", () => {
      toggleGoalDone(goal, checkbox.checked);
      scheduleSave();
    });
  }

  const range = document.querySelector<HTMLInputElement>('.modal input[type="range"]');
  const rangeValue = document.querySelector<HTMLSpanElement>(".modal .badge");
  if (range && rangeValue) {
    range.value = String(goal.progress.percent?.value ?? 0);
    rangeValue.textContent = `${goal.progress.percent?.value ?? 0}%`;
    range.addEventListener("input", () => {
      setGoalPercent(goal, Number(range.value));
      rangeValue.textContent = `${goal.progress.percent?.value ?? 0}%`;
      scheduleSave();
    });
  }

  const current = document.querySelector<HTMLInputElement>('.modal input.input--number:first-of-type');
  const target = document.querySelector<HTMLInputElement>('.modal input.input--number:nth-of-type(2)');
  if (current && target) {
    current.value = String(goal.progress.count?.current ?? 0);
    target.value = String(goal.progress.count?.target ?? 1);
    const apply = () => {
      setGoalCount(goal, {
        current: Number(current.value),
        target: Number(target.value),
      });
      scheduleSave();
    };
    current.addEventListener("input", apply);
    target.addEventListener("input", apply);
  }
}

async function exportData(): Promise<void> {
  const state = getState();
  if (!state) return;

  try {
    // Create JSON data for export
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      board: state.board
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    
    // Create download link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `bingoals-export-${state.board.year}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    await message("Failed to export data. Please try again.", { title: "Export Error", kind: "error" });
  }
}

async function init() {
  await loadOrCreateBoard();
  render();

  // Custom event listeners
  window.addEventListener("select-goal", (e: Event) => {
    const customEvent = e as CustomEvent<{ goalId: string }>;
    const state = getState()!;
    const goal = goalById(state.board, customEvent.detail.goalId);

    if (!goal) return;

    import("./ui/goalDetail.ts").then(({ renderGoalDetail }) => {
      const content = renderGoalDetail(state.board, customEvent.detail.goalId);
      if (!content) return;

      openModal(goal.title, content, () => {
        setState({ ...state, selectedGoalId: null });
        render();
      });

      wireModalGoalEvents(state.board, customEvent.detail.goalId);
    });
  });

  window.addEventListener("keydown", handleEscKey);

  window.addEventListener("export-data", exportData);
}

init().catch((err) => {
  root.replaceChildren(
    el("p", { class: "muted" }, [
      `Failed to start app: ${String(err)}`,
    ]),
  );
});
