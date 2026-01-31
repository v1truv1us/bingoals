import { el } from "./el.ts";

let currentModal: {
  overlay: HTMLElement;
  container: HTMLElement;
  closeFn: () => void;
} | null = null;

export function openModal(
  title: string,
  content: HTMLElement,
  onClose?: () => void
): void {
  if (currentModal) {
    closeModal();
  }

  const overlay = el("div", {
    class: "modal-overlay",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "modal-title",
  });

  const closeButton = el("button", {
    class: "modal__close",
    type: "button",
    "aria-label": "Close modal",
  }, ["×"]) as HTMLButtonElement;

  const titleElement = el("h2", {
    id: "modal-title",
    class: "modal__title",
  }, [title]);

  const header = el("div", {
    class: "modal__header",
  }, [titleElement, closeButton]);

  const contentWrapper = el("div", {
    class: "modal__content",
  }, [content]);

  const container = el("div", {
    class: "modal",
  }, [header, contentWrapper]);

  overlay.append(container);
  document.body.append(overlay);

  const close = () => {
    overlay.style.animation = "modal-overlay-out 0.15s ease-out forwards";
    container.style.animation = "modal-out 0.15s ease-out forwards";
    setTimeout(() => {
      overlay.remove();
      currentModal = null;
      onClose?.();
    }, 150);
  };

  currentModal = { overlay, container, closeFn: close };

  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0] as HTMLElement;
  const previouslyFocused = document.activeElement as HTMLElement;

  if (firstFocusable) {
    firstFocusable.focus();
  }

  const originalClose = close;
  const closeWithFocus = () => {
    originalClose();
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  };

  currentModal.closeFn = closeWithFocus;
}

export function closeModal(): void {
  if (currentModal) {
    currentModal.closeFn();
  }
}

export function isModalOpen(): boolean {
  return currentModal !== null;
}

export function handleEscKey(e: KeyboardEvent): void {
  if (e.key === "Escape" && isModalOpen()) {
    closeModal();
  }
}
