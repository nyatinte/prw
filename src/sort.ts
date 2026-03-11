import type { HistoryEntry } from "./history";
import type { Package } from "./workspace";

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
  const historyIndex = new Map<string, number>();
  history.forEach((h, i) => {
    if (!historyIndex.has(h.package)) {
      historyIndex.set(h.package, i);
    }
  });

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
  const historyIndex = new Map(pkgHistory.map((h, i) => [h.script, i]));

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
