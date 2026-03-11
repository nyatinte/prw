#!/usr/bin/env node
import { isCancel } from "@clack/prompts";
import type { HistoryEntry } from "./history";
import { loadHistory, saveHistory } from "./history";
import { runScript } from "./runner";
import { selectPackage, selectScript } from "./ui";
import type { Package } from "./workspace";
import {
  findWorkspaceRoot,
  getPackages,
  getScripts,
  matchPackages,
} from "./workspace";

function exitOnCancel<T>(selected: T | symbol): T {
  if (isCancel(selected)) {
    console.log("Cancelled.");
    process.exit(0);
  }
  return selected as T;
}

export async function selectPackageByArgs(
  packages: Package[],
  history: HistoryEntry[],
  args = process.argv.slice(2)
): Promise<{ pkg: Package; script: string }> {
  let pkg = packages[0];
  let script = "";

  if (args.length === 0) {
    // Interactive: select package, then script
    pkg = exitOnCancel(await selectPackage(packages, history));
  } else {
    const query = args[0];
    const matches = matchPackages(packages, query);

    if (matches.length === 0) {
      console.error(`No packages match: ${query}`);
      process.exit(1);
    } else if (matches.length === 1) {
      pkg = matches[0];
    } else if (args.length === 1) {
      // prw <package>: multiple matches → interactive select
      pkg = exitOnCancel(await selectPackage(matches, history));
    } else {
      // prw <package> <script>: multiple matches → error
      console.error(`Multiple packages match: ${query}. Be more specific.`);
      process.exit(1);
    }

    if (args.length >= 2) {
      script = args[1];
    }
  }

  return { pkg, script };
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

    let script = initialScript;

    // Select script if not provided
    if (!script) {
      const scripts = getScripts(root, pkg);

      if (scripts.length === 0) {
        console.error(`No scripts in ${pkg.name}`);
        process.exit(1);
      }

      script = exitOnCancel(await selectScript(pkg, scripts, history));
    }

    // Run script and save history
    saveHistory({
      package: pkg.name,
      script,
      timestamp: Date.now(),
    });

    runScript(pkg, script);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

if (!process.env.VITEST) {
  main();
}
