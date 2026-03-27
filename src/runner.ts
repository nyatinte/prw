import { spawnSync } from "node:child_process";

import type { Package } from "./workspace.js";
import { isRootPackage } from "./workspace.js";

export const runScript = (root: string, pkg: Package, script: string): void => {
  const isRoot = isRootPackage(pkg);
  const args = isRoot ? ["run", script] : ["--filter", pkg.name, "run", script];

  const result = spawnSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Failed to run pnpm: ${result.error.message}`);
    process.exit(1);
  }

  if (result.signal) {
    process.exit(1);
  }

  if (result.status !== null && result.status !== 0) {
    process.exit(result.status);
  }
};
