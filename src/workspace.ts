import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import glob from "fast-glob";
import YAML from "js-yaml";

const WORKSPACE_CONFIG_FILE = "pnpm-workspace.yaml";

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

export const ROOT_PACKAGE: Package = { name: "(root)", dir: "." };

export function isRootPackage(pkg: Package): boolean {
  return pkg.dir === ".";
}

export function findWorkspaceRoot(cwd: string): string {
  const current = resolve(cwd);
  const workspacePath = join(current, WORKSPACE_CONFIG_FILE);

  if (existsSync(workspacePath)) {
    return current;
  }

  throw new WorkspaceNotFoundError("Run prw from workspace root.");
}

export async function getPackages(root: string): Promise<Package[]> {
  const workspaceConfig = readFileSync(
    join(root, WORKSPACE_CONFIG_FILE),
    "utf-8"
  );
  const config = YAML.load(workspaceConfig) as { packages?: string[] };

  const packages: Package[] = [ROOT_PACKAGE];

  if (!config.packages) {
    return packages;
  }

  const dirs = await glob(config.packages, {
    cwd: root,
    absolute: false,
    onlyDirectories: true,
  });

  for (const dir of dirs) {
    const pkgJsonPath = join(root, dir, "package.json");
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      const name = pkgJson.name || dir;
      packages.push({ name, dir });
    } catch {
      // skip directories without a readable package.json
    }
  }

  return packages;
}

export function getScripts(root: string, pkg: Package): string[] {
  const pkgJsonPath = join(root, pkg.dir, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  return Object.keys(pkgJson.scripts || {});
}

export function matchPackages(packages: Package[], query: string): Package[] {
  const queryLower = query.toLowerCase();
  return packages.filter((p) => p.name.toLowerCase().includes(queryLower));
}
