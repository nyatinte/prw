import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type HistoryEntry = {
  workspaceId: string;
  package: string;
  script: string;
  timestamp: number;
};

const HISTORY_FILE_NAME = "history.json";
const MAX_HISTORY = 50;

function resolveHistoryFile(): string {
  const stateHome = process.env.XDG_STATE_HOME;
  return stateHome
    ? join(stateHome, "prw", HISTORY_FILE_NAME)
    : join(homedir(), ".local", "state", "prw", HISTORY_FILE_NAME);
}

export function loadHistory(): HistoryEntry[] {
  try {
    const content = readFileSync(resolveHistoryFile(), "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getWorkspaceId(workspaceRoot: string): string {
  return createHash("sha256").update(realpathSync(workspaceRoot)).digest("hex");
}

export function saveHistory(
  entry: HistoryEntry,
  previous: HistoryEntry[]
): void {
  try {
    const filtered = previous.filter(
      (h) =>
        !(
          h.workspaceId === entry.workspaceId &&
          h.package === entry.package &&
          h.script === entry.script
        )
    );
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    const historyFile = resolveHistoryFile();
    mkdirSync(dirname(historyFile), { recursive: true });
    writeFileSync(historyFile, JSON.stringify(updated, null, 2));
  } catch {
    // History save failure should not interrupt script execution
  }
}
