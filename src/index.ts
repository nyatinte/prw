#!/usr/bin/env node
import type { HistoryEntry } from "./history";
import { loadHistory, saveHistory } from "./history";
import { runScript } from "./runner";
import { exitOnCancel, selectPackage, selectScript } from "./ui";
import type { Package } from "./workspace";
import {
  findWorkspaceRoot,
  getPackages,
  getScripts,
  matchPackages,
} from "./workspace";

export async function selectPackageByArgs(
  packages: Package[],
  history: HistoryEntry[],
  args = process.argv.slice(2)
): Promise<{ pkg: Package; script: string }> {
  if (args.length === 0) {
    const pkg = exitOnCancel(await selectPackage(packages, history));
    return { pkg, script: "" };
  }

  const query = args[0];
  const matches = matchPackages(packages, query);

  if (matches.length === 0) {
    console.error(`No packages match: ${query}`);
    process.exit(1);
  }

  if (args.length >= 2) {
    if (matches.length !== 1) {
      console.error(`Multiple packages match: ${query}. Be more specific.`);
      process.exit(1);
    }
    return { pkg: matches[0], script: args[1] };
  }

  const pkg =
    matches.length === 1
      ? matches[0]
      : exitOnCancel(await selectPackage(matches, history));

  return { pkg, script: "" };
}

export async function resolveScript(
  root: string,
  pkg: Package,
  initialScript: string,
  history: HistoryEntry[]
): Promise<string> {
  if (initialScript) {
    return initialScript;
  }

  const scripts = getScripts(root, pkg);

  if (scripts.length === 0) {
    console.error(`No scripts in ${pkg.name}`);
    process.exit(1);
  }

  return exitOnCancel(await selectScript(pkg, scripts, history));
}

async function main() {
  try {
    const root = findWorkspaceRoot(process.cwd());
    const packages = await getPackages(root);
    const history = loadHistory();

    const { pkg, script: initialScript } = await selectPackageByArgs(
      packages,
      history
    );

    const script = await resolveScript(root, pkg, initialScript, history);

    saveHistory({ package: pkg.name, script, timestamp: Date.now() }, history);

    runScript(pkg, script);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  main();
}
