import { select } from '@clack/prompts';
import type { Package } from './workspace';
import type { HistoryEntry } from './history';
import { fuzzyFilter } from './fuzzy';

export async function selectPackage(
  packages: Package[],
  history: HistoryEntry[]
): Promise<Package> {
  const sorted = sortPackages(packages, history);

  const selected = await select({
    message: 'Select package',
    options: sorted.map(pkg => ({
      value: pkg.name,
      label: pkg.name,
      hint: pkg.dir === '.' ? '' : pkg.dir,
    })),
  });

  return sorted.find(p => p.name === selected)!;
}

export async function selectScript(
  pkg: Package,
  scripts: string[],
  history: HistoryEntry[]
): Promise<string> {
  if (scripts.length === 0) {
    throw new Error(`No scripts found in ${pkg.name}`);
  }

  const sorted = sortScripts(scripts, pkg.name, history);

  const selected = await select({
    message: 'Select script',
    options: sorted.map(script => ({
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
  const historySet = new Set(history.map(h => h.package));
  const withHistory = packages.filter(p => historySet.has(p.name));
  const withoutHistory = packages.filter(p => !historySet.has(p.name));

  withHistory.sort((a, b) => {
    const idxA = history.findIndex(h => h.package === a.name);
    const idxB = history.findIndex(h => h.package === b.name);
    return idxA - idxB;
  });

  withoutHistory.sort((a, b) => a.name.localeCompare(b.name));

  return [...withHistory, ...withoutHistory];
}

export function sortScripts(
  scripts: string[],
  packageName: string,
  history: HistoryEntry[]
): string[] {
  const pkgHistory = history.filter(h => h.package === packageName);
  const historySet = new Set(pkgHistory.map(h => h.script));

  const withHistory = scripts.filter(s => historySet.has(s));
  const withoutHistory = scripts.filter(s => !historySet.has(s));

  withHistory.sort((a, b) => {
    const idxA = pkgHistory.findIndex(h => h.script === a);
    const idxB = pkgHistory.findIndex(h => h.script === b);
    return idxA - idxB;
  });

  withoutHistory.sort();

  return [...withHistory, ...withoutHistory];
}
