import { isCancel, log, S_STEP_SUBMIT } from "@clack/prompts";
import color from "picocolors";
import type { HistoryEntry } from "./history.js";
import { m } from "./i18n.js";
import { selectPackage, selectScript } from "./ui.js";
import type { Package } from "./workspace.js";
import { getScripts, matchPackages } from "./workspace.js";

function logSelectedPackage(pkg: Package): void {
  log.message([m.select_package(), color.dim(pkg.name)], {
    symbol: color.green(S_STEP_SUBMIT),
  });
}

function exitOnCancel<T>(selected: T | symbol): T {
  if (isCancel(selected)) {
    console.log(m.cancelled());
    process.exit(0);
  }
  return selected as T;
}

export async function selectPackageByArgs(
  packages: Package[],
  history: HistoryEntry[],
  args = process.argv.slice(2)
): Promise<{ pkg: Package; script?: string }> {
  const [query, initialScript] = args;

  if (!query) {
    const pkg = exitOnCancel(await selectPackage(packages, history));
    return { pkg };
  }

  const matches = matchPackages(packages, query);

  if (matches.length === 0) {
    console.error(m.no_packages_match({ query }));
    process.exit(1);
  }

  if (initialScript) {
    if (matches.length !== 1) {
      console.error(m.multiple_packages_match({ query }));
      process.exit(1);
    }
    const [matchedPackage] = matches as [Package];
    return { pkg: matchedPackage, script: initialScript };
  }

  if (matches.length === 1) {
    const [matchedPackage] = matches as [Package];
    logSelectedPackage(matchedPackage);
    return { pkg: matchedPackage };
  }

  const pkg = exitOnCancel(await selectPackage(matches, history));
  return { pkg };
}

export async function resolveScript(
  root: string,
  pkg: Package,
  initialScript: string | undefined,
  history: HistoryEntry[]
): Promise<string> {
  if (initialScript) {
    return initialScript;
  }

  const scripts = getScripts(root, pkg);

  if (scripts.length === 0) {
    console.error(m.no_scripts_in_package({ name: pkg.name }));
    process.exit(1);
  }

  return exitOnCancel(await selectScript(pkg, scripts, history));
}
