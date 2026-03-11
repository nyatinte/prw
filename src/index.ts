#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isCancel } from "@clack/prompts";
import type { HistoryEntry } from "./history";
import { loadHistory, saveHistory } from "./history";
import { runScript } from "./runner";
import { selectPackage, selectScript } from "./ui";
import type { Package } from "./workspace";
import { findWorkspaceRoot, getPackages } from "./workspace";

async function selectPackageByArgs(
  packages: Package[],
  history: HistoryEntry[]
): Promise<{ pkg: Package; script: string }> {
  const args = process.argv.slice(2);
  let pkg = packages[0];
  let script = "";

  if (args.length === 0) {
    // Interactive: select package, then script
    const selected = await selectPackage(packages, history);
    if (isCancel(selected)) {
      console.log("Cancelled.");
      process.exit(0);
    }
    pkg = selected as Package;
  } else if (args.length === 1) {
    // prw <package>: fuzzy match and select
    const query = args[0];
    const matches = packages.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      console.error(`No packages match: ${query}`);
      process.exit(1);
    } else if (matches.length === 1) {
      pkg = matches[0];
    } else {
      const selected = await selectPackage(matches, history);
      if (isCancel(selected)) {
        console.log("Cancelled.");
        process.exit(0);
      }
      pkg = selected as Package;
    }
  } else {
    // prw <package> <script>: direct execution
    const query = args[0];
    const matches = packages.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      console.error(`No packages match: ${query}`);
      process.exit(1);
    } else if (matches.length === 1) {
      pkg = matches[0];
    } else {
      console.error(`Multiple packages match: ${query}. Be more specific.`);
      process.exit(1);
    }

    script = args[1];
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
      const pkgJsonPath = join(root, pkg.dir, "package.json");
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      const scripts = Object.keys(pkgJson.scripts || {});

      if (scripts.length === 0) {
        console.error(`No scripts in ${pkg.name}`);
        process.exit(1);
      }

      const selected = await selectScript(pkg, scripts, history);
      if (isCancel(selected)) {
        console.log("Cancelled.");
        process.exit(0);
      }
      script = selected;
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

main();
