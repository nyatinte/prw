import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
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

export type Package = {
  readonly dir: string;
  readonly name: string;
};

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
  const workspaceConfig = await readFile(
    join(root, WORKSPACE_CONFIG_FILE),
    "utf-8"
  );
  const config = (YAML.load(workspaceConfig) ?? {}) as { packages?: string[] };

  const packages: Package[] = [ROOT_PACKAGE];

  if (!config.packages) {
    return packages;
  }

  const dirs = await glob(config.packages, {
    cwd: root,
    absolute: false,
    onlyDirectories: true,
  });

  const results = await Promise.all(
    dirs.map(async (dir) => {
      try {
        const pkgJson = JSON.parse(
          await readFile(join(root, dir, "package.json"), "utf-8")
        );
        return { name: pkgJson.name || dir, dir } as Package;
      } catch {
        return null;
      }
    })
  );
  packages.push(...results.filter((p): p is Package => p !== null));

  return packages;
}

export interface Script {
  readonly command: string;
  readonly name: string;
}

export function getScripts(root: string, pkg: Package): Script[] {
  try {
    const pkgJson = JSON.parse(
      readFileSync(join(root, pkg.dir, "package.json"), "utf-8")
    );
    const scripts = pkgJson.scripts;
    if (!scripts || typeof scripts !== "object") {
      return [];
    }
    return Object.entries(scripts).map(([name, command]) => ({
      name,
      command: typeof command === "string" ? command : "",
    }));
  } catch {
    return [];
  }
}

export function matchPackages(packages: Package[], query: string): Package[] {
  const queryLower = query.toLowerCase();
  return packages.filter((p) => p.name.toLowerCase().includes(queryLower));
}
