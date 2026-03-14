import { resolveScript, selectPackageByArgs } from "./cli.js";
import { loadHistory, saveHistory } from "./history.js";
import { runScript } from "./runner.js";
import { findWorkspaceRoot, getPackages } from "./workspace.js";

export async function main() {
  try {
    const root = findWorkspaceRoot(process.cwd());
    const packagesPromise = getPackages(root);
    const history = loadHistory();
    const packages = await packagesPromise;

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
