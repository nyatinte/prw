import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import glob from "fast-glob";
import YAML from "js-yaml";

export class WorkspaceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceNotFoundError";
  }
}

export interface Package {
  dir: string;
  name: string;
}

export function findWorkspaceRoot(cwd: string): string {
  let current = resolve(cwd);

  while (true) {
    const workspacePath = join(current, "pnpm-workspace.yaml");
    if (existsSync(workspacePath)) {
      return current;
    }

    const parent = join(current, "..");
    if (parent === current) {
      throw new WorkspaceNotFoundError(
        "pnpm-workspace.yaml not found. Are you in a pnpm workspace?"
      );
    }
    current = parent;
  }
}

export async function getPackages(root: string): Promise<Package[]> {
  const workspaceConfig = readFileSync(
    join(root, "pnpm-workspace.yaml"),
    "utf-8"
  );
  const config = YAML.load(workspaceConfig) as { packages?: string[] };

  const packages: Package[] = [{ name: "(root)", dir: "." }];

  if (!config.packages) {
    return packages;
  }

  for (const pattern of config.packages) {
    const dirs = await glob(pattern, {
      cwd: root,
      absolute: false,
      onlyDirectories: true,
    });

    for (const dir of dirs) {
      const pkgJsonPath = join(root, dir, "package.json");
      if (!existsSync(pkgJsonPath)) {
        continue;
      }

      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      const name = pkgJson.name || dir;

      packages.push({ name, dir });
    }
  }

  return packages;
}
