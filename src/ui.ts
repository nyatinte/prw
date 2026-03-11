import { autocomplete, isCancel } from "@clack/prompts";
import type { HistoryEntry } from "./history";
import type { Package } from "./workspace";

export async function selectPackage(
  packages: Package[],
  history: HistoryEntry[]
): Promise<Package | symbol> {
  const sorted = sortPackages(packages, history);

  const selected = await autocomplete({
    message: "Select package",
    options: sorted.map((pkg) => ({
      value: pkg.name,
      label: pkg.name,
      hint: pkg.dir === "." ? "" : pkg.dir,
    })),
  });

  if (isCancel(selected)) {
    return selected;
  }

  const found = sorted.find((p) => p.name === (selected as string));
  if (!found) {
    throw new Error(`Package "${selected}" not found`);
  }
  return found;
}

export async function selectScript(
  pkg: Package,
  scripts: string[],
  history: HistoryEntry[]
): Promise<string | symbol> {
  if (scripts.length === 0) {
    throw new Error(`No scripts found in ${pkg.name}`);
  }

  const sorted = sortScripts(scripts, pkg.name, history);

  const selected = await autocomplete({
    message: "Select script",
    options: sorted.map((script) => ({
      value: script,
      label: script,
    })),
  });

  return selected;
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

  const withHistory = packages.filter((p) => historyIndex.has(p.name));
  const withoutHistory = packages.filter((p) => !historyIndex.has(p.name));

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

  const withHistory = scripts.filter((s) => historyIndex.has(s));
  const withoutHistory = scripts.filter((s) => !historyIndex.has(s));

  withHistory.sort(
    (a, b) => (historyIndex.get(a) ?? 0) - (historyIndex.get(b) ?? 0)
  );
  withoutHistory.sort();

  return [...withHistory, ...withoutHistory];
}
