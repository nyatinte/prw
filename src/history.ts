import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface HistoryEntry {
  package: string;
  script: string;
  timestamp: number;
}

const HISTORY_FILE = join(homedir(), ".prw_history");
const MAX_HISTORY = 50;

export function loadHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const content = readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export function saveHistory(entry: HistoryEntry): void {
  const history = loadHistory();

  const existingIndex = history.findIndex(
    (h) => h.package === entry.package && h.script === entry.script
  );

  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }

  history.unshift(entry);

  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  const dir = join(homedir(), ".prw");
  mkdirSync(dir, { recursive: true });

  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}
