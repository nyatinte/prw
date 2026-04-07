import { defineCommand, showUsage, runMain } from "citty";

import pkg from "../package.json" with { type: "json" };
import { resolveScript, selectPackageByArgs } from "./cli.js";
import { loadHistory, saveHistory } from "./history.js";
import { runScript } from "./runner.js";
import { findWorkspaceRoot, getPackages } from "./workspace.js";

const command = defineCommand({
  args: {
    help: {
      type: "boolean",
      alias: "h",
      description: "Show help",
    },
    version: {
      type: "boolean",
      alias: "v",
      description: "Show version number",
    },
    package: {
      type: "positional",
      required: false,
      description: "Package name or fuzzy search query",
    },
    script: {
      type: "positional",
      required: false,
      description: "Script name to run in the selected package",
    },
  },
  meta: {
    name: "prw",
    version: pkg.version,
    description: "Interactive pnpm workspace package & script runner",
  },
  async run({ args }) {
    if (args.help) {
      await showUsage(command);
      return;
    }

    if (args.version) {
      console.log(pkg.version);
      return;
    }

    try {
      const root = findWorkspaceRoot(process.cwd());
      const packagesPromise = getPackages(root);
      const history = loadHistory(root);
      const packages = await packagesPromise;

      const cliArgs = [args.package, args.script].filter(
        (v): v is string => v !== undefined
      );

      const { pkg, script: initialScript } = await selectPackageByArgs(
        packages,
        history,
        cliArgs
      );

      const script = await resolveScript(root, pkg, initialScript, history);

      saveHistory(root, { package: pkg.name, script }, history);

      runScript(root, pkg, script);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});

export function main() {
  return runMain(command);
}
