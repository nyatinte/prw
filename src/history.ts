import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type HistoryEntry = {
  package: string;
  script: string;
  timestamp: number;
};

const MAX_HISTORY = 50;

function resolveHistoryDir(): string {
  const stateHome = process.env.XDG_STATE_HOME;
  if (stateHome) {
    return join(stateHome, "prw");
  }

  return join(homedir(), ".local", "state", "prw");
}

function resolveHistoryFile(): string {
  return join(resolveHistoryDir(), "history.json");
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

export function saveHistory(
  entry: HistoryEntry,
  previous: HistoryEntry[]
): void {
  try {
    const filtered = previous.filter(
      (h) => !(h.package === entry.package && h.script === entry.script)
    );
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    const historyDir = resolveHistoryDir();
    const historyFile = resolveHistoryFile();
    mkdirSync(historyDir, { recursive: true });
    writeFileSync(historyFile, JSON.stringify(updated, null, 2));
  } catch {
    // History save failure should not interrupt script execution
  }
}
