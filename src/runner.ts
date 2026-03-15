import { spawnSync } from "node:child_process";
import { m } from "./i18n.js";
import type { Package } from "./workspace.js";
import { isRootPackage } from "./workspace.js";

export function runScript(root: string, pkg: Package, script: string): void {
  const isRoot = isRootPackage(pkg);
  const args = isRoot ? ["run", script] : ["--filter", pkg.name, "run", script];

  const result = spawnSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(m.pnpm_run_failed({ message: result.error.message }));
    process.exit(1);
  }

  if (result.signal) {
    process.exit(1);
  }

  if (result.status !== null && result.status !== 0) {
    process.exit(result.status);
  }
}
