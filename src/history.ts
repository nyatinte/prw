import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type HistoryEntry = {
  package: string;
  script: string;
};

const HISTORY_DIR_NAME = "histories";
const MAX_HISTORY = 50;

function resolveHistoryFile(workspaceRoot: string): string {
  const stateHome = process.env.XDG_STATE_HOME;
  const historyDir = stateHome
    ? join(stateHome, "prw", HISTORY_DIR_NAME)
    : join(homedir(), ".local", "state", "prw", HISTORY_DIR_NAME);
  return join(historyDir, `${getWorkspaceId(workspaceRoot)}.json`);
}

export function loadHistory(workspaceRoot: string): HistoryEntry[] {
  try {
    const content = readFileSync(resolveHistoryFile(workspaceRoot), "utf-8");
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
  workspaceRoot: string,
  entry: HistoryEntry,
  previous: HistoryEntry[]
): void {
  try {
    const filtered = previous.filter(
      (h) => !(h.package === entry.package && h.script === entry.script)
    );
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    const historyFile = resolveHistoryFile(workspaceRoot);
    mkdirSync(dirname(historyFile), { recursive: true });
    writeFileSync(historyFile, JSON.stringify(updated, null, 2));
  } catch {
    // History save failure should not interrupt script execution
  }
}
