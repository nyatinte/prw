import type { HistoryEntry } from "./history";
import type { Package } from "./workspace";

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

  const withHistory: Package[] = [];
  const withoutHistory: Package[] = [];
  for (const p of packages) {
    if (historyIndex.has(p.name)) {
      withHistory.push(p);
    } else {
      withoutHistory.push(p);
    }
  }

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

  const withHistory: string[] = [];
  const withoutHistory: string[] = [];
  for (const s of scripts) {
    if (historyIndex.has(s)) {
      withHistory.push(s);
    } else {
      withoutHistory.push(s);
    }
  }

  withHistory.sort(
    (a, b) => (historyIndex.get(a) ?? 0) - (historyIndex.get(b) ?? 0)
  );
  withoutHistory.sort();

  return [...withHistory, ...withoutHistory];
}
