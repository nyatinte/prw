import { autocomplete, isCancel } from "@clack/prompts";
import type { HistoryEntry } from "./history";
import { sortPackages, sortScripts } from "./sort";
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
