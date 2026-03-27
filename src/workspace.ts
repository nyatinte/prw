import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { glob } from "tinyglobby";
import { parse } from "yaml";

const WORKSPACE_CONFIG_FILE = "pnpm-workspace.yaml";
const TRAILING_PATH_SEPARATOR_PATTERN = /[\\/]+$/;
const IGNORE_GLOBS = ["**/node_modules", "**/node_modules/**"];

export class WorkspaceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceNotFoundError";
  }
}

export interface Package {
  readonly dir: string;
  readonly name: string;
}

export const ROOT_PACKAGE: Package = { dir: ".", name: "(root)" };

export const isRootPackage = (pkg: Package): boolean => pkg.dir === ".";

export const findWorkspaceRoot = (cwd: string): string => {
  let current = resolve(cwd);

  while (true) {
    const workspacePath = join(current, WORKSPACE_CONFIG_FILE);
    if (existsSync(workspacePath)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new WorkspaceNotFoundError("Run prw inside a pnpm workspace.");
};

export const getPackages = async (root: string): Promise<Package[]> => {
  const workspaceConfig = await readFile(
    join(root, WORKSPACE_CONFIG_FILE),
    "utf8"
  );
  const parsed: unknown = parse(workspaceConfig);
  const config =
    typeof parsed === "object" && parsed !== null
      ? (parsed as { packages?: string[] })
      : {};

  const packages: Package[] = [ROOT_PACKAGE];

  if (config.packages === undefined) {
    return packages;
  }

  const dirs = await glob(config.packages, {
    absolute: false,
    cwd: root,
    ignore: IGNORE_GLOBS,
    onlyDirectories: true,
  });

  const results = await Promise.all(
    dirs.map(async (rawDir) => {
      const dir = rawDir.replace(TRAILING_PATH_SEPARATOR_PATTERN, "");
      try {
        const pkgJson: unknown = JSON.parse(
          await readFile(join(root, dir, "package.json"), "utf8")
        );
        const name =
          typeof pkgJson === "object" && pkgJson !== null
            ? (pkgJson as Record<string, unknown>).name
            : undefined;
        return { dir, name: typeof name === "string" ? name : dir };
      } catch {
        return null;
      }
    })
  );
  packages.push(...results.filter((p): p is Package => p !== null));

  return packages;
};

export interface Script {
  readonly command: string;
  readonly name: string;
}

export const getScripts = (root: string, pkg: Package): Script[] => {
  try {
    const pkgJson: unknown = JSON.parse(
      readFileSync(join(root, pkg.dir, "package.json"), "utf8")
    );
    if (typeof pkgJson !== "object" || pkgJson === null) {
      return [];
    }
    const { scripts } = pkgJson as Record<string, unknown>;
    if (
      scripts === null ||
      scripts === undefined ||
      typeof scripts !== "object"
    ) {
      return [];
    }
    return Object.entries(scripts as Record<string, unknown>).map(
      ([name, command]) => ({
        command: typeof command === "string" ? command : "",
        name,
      })
    );
  } catch {
    return [];
  }
};

export const matchPackages = (
  packages: Package[],
  query: string
): Package[] => {
  const queryLower = query.toLowerCase();
  return packages.filter((p) => p.name.toLowerCase().includes(queryLower));
};
