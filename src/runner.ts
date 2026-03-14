import { spawnSync } from "node:child_process";
import type { Package } from "./workspace";
import { isRootPackage } from "./workspace";

export function runScript(pkg: Package, script: string): void {
  const isRoot = isRootPackage(pkg);
  const args = isRoot ? ["run", script] : ["--filter", pkg.name, "run", script];

  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Failed to run pnpm: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== null && result.status !== 0) {
    process.exit(result.status);
  }
}
