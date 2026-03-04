import { spawnSync } from "node:child_process";
import type { Package } from "./workspace";

export function runScript(pkg: Package, script: string): void {
  const isRoot = pkg.dir === ".";
  const args = isRoot ? ["run", script] : ["--filter", pkg.name, "run", script];

  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
  });

  if (result.status !== null && result.status !== 0) {
    process.exit(result.status);
  }
}
