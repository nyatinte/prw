import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type HistoryEntry = {
  package: string;
  script: string;
  timestamp: number;
};

const HISTORY_FILE_NAME = "history.json";
const MAX_HISTORY = 50;

export function resolveHistoryDir(): string {
  return join(
    process.env.XDG_STATE_HOME ?? homedir(),
    ...(process.env.XDG_STATE_HOME ? ["prw"] : [".local", "state", "prw"])
  );
}

export function resolveHistoryFile(): string {
  return join(resolveHistoryDir(), HISTORY_FILE_NAME);
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
