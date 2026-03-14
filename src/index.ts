import { resolveScript, selectPackageByArgs } from "./cli.js";
import { getWorkspaceId, loadHistory, saveHistory } from "./history.js";
import { runScript } from "./runner.js";
import { findWorkspaceRoot, getPackages } from "./workspace.js";

export async function main() {
  try {
    const root = findWorkspaceRoot(process.cwd());
    const workspaceId = getWorkspaceId(root);
    const packagesPromise = getPackages(root);
    const history = loadHistory();
    const workspaceHistory = history.filter(
      (entry) => entry.workspaceId === workspaceId
    );
    const packages = await packagesPromise;

    const { pkg, script: initialScript } = await selectPackageByArgs(
      packages,
      workspaceHistory
    );

    const script = await resolveScript(
      root,
      pkg,
      initialScript,
      workspaceHistory
    );

    saveHistory(
      { workspaceId, package: pkg.name, script, timestamp: Date.now() },
      history
    );

    runScript(root, pkg, script);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
