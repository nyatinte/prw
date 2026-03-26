import { autocomplete, isCancel } from "@clack/prompts";

import type { HistoryEntry } from "./history.js";
import { sortPackages, sortScripts } from "./sort.js";
import type { Package, Script } from "./workspace.js";
import { isRootPackage } from "./workspace.js";

export const SELECT_PACKAGE_MESSAGE = "Select package";

export async function selectPackage(
  packages: Package[],
  history: HistoryEntry[]
): Promise<Package | symbol> {
  const sorted = sortPackages(packages, history);

  const selected = await autocomplete({
    message: SELECT_PACKAGE_MESSAGE,
    options: sorted.map((pkg) => ({
      hint: isRootPackage(pkg) ? "" : pkg.dir,
      label: pkg.name,
      value: pkg.name,
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
  scripts: Script[],
  history: HistoryEntry[]
): Promise<string | symbol> {
  const sorted = sortScripts(scripts, pkg.name, history);

  const selected = await autocomplete({
    message: "Select script",
    options: sorted.map((script) => ({
      hint: script.command,
      label: script.name,
      value: script.name,
    })),
  });

  return selected;
}
