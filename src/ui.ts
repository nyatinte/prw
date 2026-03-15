import { autocomplete, isCancel } from "@clack/prompts";
import type { HistoryEntry } from "./history.js";
import { m } from "./i18n.js";
import { sortPackages, sortScripts } from "./sort.js";
import type { Package, Script } from "./workspace.js";
import { isRootPackage } from "./workspace.js";

export async function selectPackage(
  packages: Package[],
  history: HistoryEntry[]
): Promise<Package | symbol> {
  const sorted = sortPackages(packages, history);

  const selected = await autocomplete({
    message: m.select_package(),
    options: sorted.map((pkg) => ({
      value: pkg.name,
      label: pkg.name,
      hint: isRootPackage(pkg) ? "" : pkg.dir,
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
    message: m.select_script(),
    options: sorted.map((script) => ({
      value: script.name,
      label: script.name,
      hint: script.command,
    })),
  });

  return selected;
}
