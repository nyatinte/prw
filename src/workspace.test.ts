import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findWorkspaceRoot,
  getPackages,
  getScripts,
  isRootPackage,
  matchPackages,
  ROOT_PACKAGE,
  WorkspaceNotFoundError,
} from "./workspace";

describe("workspace", () => {
  const tmpDir = join("/tmp", `prw-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("findWorkspaceRoot", () => {
    it("returns path with pnpm-workspace.yaml in current dir", () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );

      const result = findWorkspaceRoot(root);
      expect(result).toBe(root);
    });

    it("throws WorkspaceNotFoundError when not in workspace", () => {
      expect(() => findWorkspaceRoot(tmpDir)).toThrow(
        new WorkspaceNotFoundError("Run prw from workspace root.")
      );
    });
  });

  describe("getPackages", () => {
    it("always returns root as first entry", async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );

      const packages = await getPackages(root);
      expect(packages[0]).toEqual({ name: "(root)", dir: "." });
    });

    it("returns packages from glob pattern", async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );

      mkdirSync(join(root, "apps", "web"), { recursive: true });
      writeFileSync(
        join(root, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web" })
      );

      mkdirSync(join(root, "apps", "api"), { recursive: true });
      writeFileSync(
        join(root, "apps", "api", "package.json"),
        JSON.stringify({ name: "@myapp/api" })
      );

      const packages = await getPackages(root);
      expect(packages.length).toBe(3);
      expect(packages[0]).toEqual({ name: "(root)", dir: "." });
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/api")).toBe(true);
    });

    it("uses dir as fallback when package.json has no name", async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );

      mkdirSync(join(root, "apps", "unnamed"), { recursive: true });
      writeFileSync(
        join(root, "apps", "unnamed", "package.json"),
        JSON.stringify({})
      );

      const packages = await getPackages(root);
      expect(packages.some((p) => p.name === "apps/unnamed")).toBe(true);
    });

    it("returns only root when no packages matched", async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );

      const packages = await getPackages(root);
      expect(packages).toEqual([{ name: "(root)", dir: "." }]);
    });

    it("excludes directories matching negation pattern", async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n  - '!apps/legacy'\n"
      );

      mkdirSync(join(root, "apps", "web"), { recursive: true });
      writeFileSync(
        join(root, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web" })
      );

      mkdirSync(join(root, "apps", "legacy"), { recursive: true });
      writeFileSync(
        join(root, "apps", "legacy", "package.json"),
        JSON.stringify({ name: "@myapp/legacy" })
      );

      const packages = await getPackages(root);
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/legacy")).toBe(false);
    });

    it("handles multiple patterns", async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n  - packages/*\n"
      );

      mkdirSync(join(root, "apps", "web"), { recursive: true });
      writeFileSync(
        join(root, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web" })
      );

      mkdirSync(join(root, "packages", "ui"), { recursive: true });
      writeFileSync(
        join(root, "packages", "ui", "package.json"),
        JSON.stringify({ name: "@myapp/ui" })
      );

      const packages = await getPackages(root);
      expect(packages.length).toBe(3);
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/ui")).toBe(true);
    });
  });

  describe("getScripts", () => {
    it("returns script names from package.json", () => {
      const root = tmpDir;
      mkdirSync(join(root, "apps", "web"), { recursive: true });
      writeFileSync(
        join(root, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web", scripts: { dev: "vite", build: "tsc" } })
      );

      const scripts = getScripts(root, { name: "@myapp/web", dir: "apps/web" });
      expect(scripts).toEqual(["dev", "build"]);
    });

    it("returns empty array when scripts field is missing", () => {
      const root = tmpDir;
      mkdirSync(join(root, "apps", "api"), { recursive: true });
      writeFileSync(
        join(root, "apps", "api", "package.json"),
        JSON.stringify({ name: "@myapp/api" })
      );

      const scripts = getScripts(root, { name: "@myapp/api", dir: "apps/api" });
      expect(scripts).toEqual([]);
    });

    it("returns empty array when package.json does not exist", () => {
      const root = tmpDir;
      mkdirSync(join(root, "apps", "ghost"), { recursive: true });

      const scripts = getScripts(root, { name: "@myapp/ghost", dir: "apps/ghost" });
      expect(scripts).toEqual([]);
    });
  });

  describe("isRootPackage", () => {
    it("returns true for ROOT_PACKAGE", () => {
      expect(isRootPackage(ROOT_PACKAGE)).toBe(true);
    });

    it("returns false for a regular package", () => {
      expect(isRootPackage({ name: "@myapp/web", dir: "apps/web" })).toBe(false);
    });
  });

  describe("matchPackages", () => {
    const packages = [
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
      { name: "@myapp/web-admin", dir: "apps/web-admin" },
    ];

    it("returns packages whose name includes the query (case-insensitive)", () => {
      const result = matchPackages(packages, "api");
      expect(result).toEqual([{ name: "@myapp/api", dir: "apps/api" }]);
    });

    it("returns multiple matches when query is ambiguous", () => {
      const result = matchPackages(packages, "web");
      expect(result.map((p) => p.name)).toEqual(["@myapp/web", "@myapp/web-admin"]);
    });

    it("returns empty array when no packages match", () => {
      expect(matchPackages(packages, "nonexistent")).toEqual([]);
    });

    it("matches case-insensitively", () => {
      const result = matchPackages(packages, "API");
      expect(result).toEqual([{ name: "@myapp/api", dir: "apps/api" }]);
    });
  });
});
