import { invoke } from "@tauri-apps/api/core";

export async function getBoard(): Promise<unknown | null> {
  return invoke<unknown | null>("get_board");
}

export async function saveBoard(board: unknown): Promise<void> {
  await invoke("save_board", { board });
}

export async function resetBoard(): Promise<void> {
  await invoke("reset_board");
}
