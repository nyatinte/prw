import type { HistoryEntry } from "./history";
import type { Package } from "./workspace";

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

function partitionByHistory<T>(
  items: T[],
  historyIndex: Map<string, number>,
  getKey: (item: T) => string
): [withHistory: T[], withoutHistory: T[]] {
  const withHistory: T[] = [];
  const withoutHistory: T[] = [];
  for (const item of items) {
    if (historyIndex.has(getKey(item))) {
      withHistory.push(item);
    } else {
      withoutHistory.push(item);
    }
  }
  return [withHistory, withoutHistory];
}

export function sortPackages(
  packages: Package[],
  history: HistoryEntry[]
): Package[] {
  const historyIndex = buildFirstOccurrenceIndex(history, (h) => h.package);

  const [withHistory, withoutHistory] = partitionByHistory(
    packages,
    historyIndex,
    (p) => p.name
  );

  withHistory.sort(
    (a, b) => (historyIndex.get(a.name) ?? 0) - (historyIndex.get(b.name) ?? 0)
  );
  withoutHistory.sort((a, b) => a.name.localeCompare(b.name));

  return [...withHistory, ...withoutHistory];
}

export function sortScripts(
  scripts: string[],
  packageName: string,
  history: HistoryEntry[]
): string[] {
  const pkgHistory = history.filter((h) => h.package === packageName);
  const historyIndex = buildFirstOccurrenceIndex(pkgHistory, (h) => h.script);

  const [withHistory, withoutHistory] = partitionByHistory(
    scripts,
    historyIndex,
    (s) => s
  );

  withHistory.sort(
    (a, b) => (historyIndex.get(a) ?? 0) - (historyIndex.get(b) ?? 0)
  );
  withoutHistory.sort();

  return [...withHistory, ...withoutHistory];
}
