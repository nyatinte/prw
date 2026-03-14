import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type HistoryEntry = {
  package: string;
  script: string;
  timestamp: number;
};

const HISTORY_DIR = join(homedir(), ".config", "prw");
const HISTORY_FILE = join(HISTORY_DIR, "history.json");
const MAX_HISTORY = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const content = readFileSync(HISTORY_FILE, "utf-8");
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
    mkdirSync(HISTORY_DIR, { recursive: true });
    writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2));
  } catch {
    // History save failure should not interrupt script execution
  }
}
