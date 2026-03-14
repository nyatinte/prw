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
} from "./workspace.js";

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
      writeFileSync(
        join(tmpDir, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );

      expect(findWorkspaceRoot(tmpDir)).toBe(tmpDir);
    });

    it("returns nearest workspace root from nested workspace dir", () => {
      writeFileSync(
        join(tmpDir, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );
      mkdirSync(join(tmpDir, "apps", "web", "src"), { recursive: true });

      expect(findWorkspaceRoot(join(tmpDir, "apps", "web", "src"))).toBe(
        tmpDir
      );
    });

    it("throws WorkspaceNotFoundError when not in a workspace", () => {
      expect(() => findWorkspaceRoot(tmpDir)).toThrow(
        new WorkspaceNotFoundError("Run prw inside a pnpm workspace.")
      );
    });
  });

  describe("getPackages", () => {
    it("returns packages from glob pattern", async () => {
      writeFileSync(
        join(tmpDir, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );
      mkdirSync(join(tmpDir, "apps", "web"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web" })
      );
      mkdirSync(join(tmpDir, "apps", "api"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "api", "package.json"),
        JSON.stringify({ name: "@myapp/api" })
      );

      const packages = await getPackages(tmpDir);
      expect(packages.length).toBe(3);
      expect(packages[0]).toEqual({ name: "(root)", dir: "." });
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/api")).toBe(true);
    });

    it("uses dir as fallback when package.json has no name", async () => {
      writeFileSync(
        join(tmpDir, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n"
      );
      mkdirSync(join(tmpDir, "apps", "unnamed"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "unnamed", "package.json"),
        JSON.stringify({})
      );

      const packages = await getPackages(tmpDir);
      expect(packages.some((p) => p.name === "apps/unnamed")).toBe(true);
    });

    it.each([
      ["no packages match the glob", "packages:\n  - apps/*\n"],
      ["workspace yaml is empty", ""],
    ])("returns only root when %s", async (_, yaml) => {
      writeFileSync(join(tmpDir, "pnpm-workspace.yaml"), yaml);

      const packages = await getPackages(tmpDir);
      expect(packages).toEqual([{ name: "(root)", dir: "." }]);
    });

    it("excludes directories matching negation pattern", async () => {
      writeFileSync(
        join(tmpDir, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n  - '!apps/legacy'\n"
      );
      mkdirSync(join(tmpDir, "apps", "web"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web" })
      );
      mkdirSync(join(tmpDir, "apps", "legacy"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "legacy", "package.json"),
        JSON.stringify({ name: "@myapp/legacy" })
      );

      const packages = await getPackages(tmpDir);
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/legacy")).toBe(false);
    });

    it("handles multiple patterns", async () => {
      writeFileSync(
        join(tmpDir, "pnpm-workspace.yaml"),
        "packages:\n  - apps/*\n  - packages/*\n"
      );
      mkdirSync(join(tmpDir, "apps", "web"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "web", "package.json"),
        JSON.stringify({ name: "@myapp/web" })
      );
      mkdirSync(join(tmpDir, "packages", "ui"), { recursive: true });
      writeFileSync(
        join(tmpDir, "packages", "ui", "package.json"),
        JSON.stringify({ name: "@myapp/ui" })
      );

      const packages = await getPackages(tmpDir);
      expect(packages.length).toBe(3);
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/ui")).toBe(true);
    });
  });

  describe("getScripts", () => {
    it("returns script names and commands from package.json", () => {
      mkdirSync(join(tmpDir, "apps", "web"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "web", "package.json"),
        JSON.stringify({
          name: "@myapp/web",
          scripts: { dev: "vite", build: "tsc" },
        })
      );

      expect(
        getScripts(tmpDir, { name: "@myapp/web", dir: "apps/web" })
      ).toEqual([
        { name: "dev", command: "vite" },
        { name: "build", command: "tsc" },
      ]);
    });

    it("returns empty array when scripts field is missing", () => {
      mkdirSync(join(tmpDir, "apps", "api"), { recursive: true });
      writeFileSync(
        join(tmpDir, "apps", "api", "package.json"),
        JSON.stringify({ name: "@myapp/api" })
      );

      expect(
        getScripts(tmpDir, { name: "@myapp/api", dir: "apps/api" })
      ).toEqual([]);
    });

    it("returns empty array when package.json does not exist", () => {
      mkdirSync(join(tmpDir, "apps", "ghost"), { recursive: true });

      expect(
        getScripts(tmpDir, { name: "@myapp/ghost", dir: "apps/ghost" })
      ).toEqual([]);
    });
  });

  describe("isRootPackage", () => {
    it.each([
      [ROOT_PACKAGE, true],
      [{ name: "@myapp/web", dir: "apps/web" }, false],
    ])("returns %s for %o", (pkg, expected) => {
      expect(isRootPackage(pkg)).toBe(expected);
    });
  });

  describe("matchPackages", () => {
    const packages = [
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
      { name: "@myapp/web-admin", dir: "apps/web-admin" },
    ];

    it.each([
      ["api", ["@myapp/api"]],
      ["API", ["@myapp/api"]],
      ["web", ["@myapp/web", "@myapp/web-admin"]],
      ["nonexistent", []],
    ])("matchPackages('%s') returns %j", (query, expectedNames) => {
      const result = matchPackages(packages, query);
      expect(result.map((p) => p.name)).toEqual(expectedNames);
    });
  });
});
