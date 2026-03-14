import type { HistoryEntry } from "./history.js";
import type { Package, Script } from "./workspace.js";

function buildFirstOccurrenceIndex(
  entries: HistoryEntry[],
  getKey: (h: HistoryEntry) => string
): Map<string, number> {
  const index = new Map<string, number>();
  entries.forEach((h, i) => {
    const key = getKey(h);
    if (!index.has(key)) {
      index.set(key, i);
    }
  });
  return index;
}

function sortByHistory<T>(
  items: T[],
  history: HistoryEntry[],
  getHistoryKey: (h: HistoryEntry) => string,
  getItemKey: (item: T) => string,
  compareFallback: (a: T, b: T) => number
): T[] {
  const historyIndex = buildFirstOccurrenceIndex(history, getHistoryKey);
  const withHistory: T[] = [];
  const withoutHistory: T[] = [];
  for (const item of items) {
    if (historyIndex.has(getItemKey(item))) {
      withHistory.push(item);
    } else {
      withoutHistory.push(item);
    }
  }
  withHistory.sort(
    (a, b) =>
      (historyIndex.get(getItemKey(a)) ?? 0) -
      (historyIndex.get(getItemKey(b)) ?? 0)
  );
  withoutHistory.sort(compareFallback);
  return [...withHistory, ...withoutHistory];
}

export function sortPackages(
  packages: Package[],
  history: HistoryEntry[]
): Package[] {
  return sortByHistory(
    packages,
    history,
    (h) => h.package,
    (p) => p.name,
    (a, b) => a.name.localeCompare(b.name)
  );
}

export function sortScripts(
  scripts: Script[],
  packageName: string,
  history: HistoryEntry[]
): Script[] {
  const pkgHistory = history.filter((h) => h.package === packageName);
  return sortByHistory(
    scripts,
    pkgHistory,
    (h) => h.script,
    (s) => s.name,
    (a, b) => a.name.localeCompare(b.name)
  );
}
