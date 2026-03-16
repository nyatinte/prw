import { createFixture } from "fs-fixture";
import { describe, expect, it } from "vitest";
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
  describe(findWorkspaceRoot, () => {
    it("returns path with pnpm-workspace.yaml in current dir", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      });

      expect(findWorkspaceRoot(fixture.path)).toBe(fixture.path);
    });

    it("returns nearest workspace root from nested workspace dir", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
        "apps/web/src": {},
      });

      expect(findWorkspaceRoot(fixture.getPath("apps", "web", "src"))).toBe(
        fixture.path
      );
    });

    it("returns nearest workspace root when nested workspaces exist", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
        apps: {
          web: {
            "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
            packages: {
              ui: {
                src: {},
              },
            },
          },
        },
      });

      expect(
        findWorkspaceRoot(
          fixture.getPath("apps", "web", "packages", "ui", "src")
        )
      ).toBe(fixture.getPath("apps", "web"));
    });

    it("throws WorkspaceNotFoundError when not in a workspace", async () => {
      await using fixture = await createFixture();

      expect(() => findWorkspaceRoot(fixture.path)).toThrow(
        new WorkspaceNotFoundError("Run prw inside a pnpm workspace.")
      );
    });
  });

  describe(getPackages, () => {
    it("returns packages from glob pattern", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
          },
          api: {
            "package.json": JSON.stringify({ name: "@myapp/api" }),
          },
        },
      });

      const packages = await getPackages(fixture.path);
      expect(packages.length).toBe(3);
      expect(packages[0]).toEqual({ name: "(root)", dir: "." });
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/api")).toBe(true);
    });

    it("uses dir as fallback when package.json has no name", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
        apps: {
          unnamed: {
            "package.json": JSON.stringify({}),
          },
        },
      });

      const packages = await getPackages(fixture.path);
      expect(packages.some((p) => p.name === "apps/unnamed")).toBe(true);
    });

    it.each([
      ["no packages match the glob", "packages:\n  - apps/*\n"],
      ["workspace yaml is empty", ""],
    ])("returns only root when %s", async (_, yaml) => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": yaml,
      });

      const packages = await getPackages(fixture.path);
      expect(packages).toEqual([{ name: "(root)", dir: "." }]);
    });

    it("excludes directories matching negation pattern", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - '!apps/legacy'\n",
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
          },
          legacy: {
            "package.json": JSON.stringify({ name: "@myapp/legacy" }),
          },
        },
      });

      const packages = await getPackages(fixture.path);
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/legacy")).toBe(false);
    });

    it("ignores packages matched inside node_modules", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - app*\n",
        app: {
          "package.json": JSON.stringify({ name: "@myapp/app" }),
        },
        app2: {
          node_modules: {
            dep: {
              "package.json": JSON.stringify({ name: "@dep/should-ignore" }),
            },
          },
        },
      });

      const packages = await getPackages(fixture.path);
      expect(packages.some((p) => p.name === "@myapp/app")).toBe(true);
      expect(packages.some((p) => p.name === "@dep/should-ignore")).toBe(false);
    });

    it("handles multiple patterns", async () => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*\n",
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
          },
        },
        packages: {
          ui: {
            "package.json": JSON.stringify({ name: "@myapp/ui" }),
          },
        },
      });

      const packages = await getPackages(fixture.path);
      expect(packages.length).toBe(3);
      expect(packages.some((p) => p.name === "@myapp/web")).toBe(true);
      expect(packages.some((p) => p.name === "@myapp/ui")).toBe(true);
    });
  });

  describe(getScripts, () => {
    it("returns script names and commands from package.json", async () => {
      await using fixture = await createFixture({
        apps: {
          web: {
            "package.json": JSON.stringify({
              name: "@myapp/web",
              scripts: { dev: "vite", build: "tsc" },
            }),
          },
        },
      });

      expect(
        getScripts(fixture.path, { name: "@myapp/web", dir: "apps/web" })
      ).toEqual([
        { name: "dev", command: "vite" },
        { name: "build", command: "tsc" },
      ]);
    });

    it("returns empty array when scripts field is missing", async () => {
      await using fixture = await createFixture({
        apps: {
          api: {
            "package.json": JSON.stringify({ name: "@myapp/api" }),
          },
        },
      });

      expect(
        getScripts(fixture.path, { name: "@myapp/api", dir: "apps/api" })
      ).toEqual([]);
    });

    it("returns empty array when package.json does not exist", async () => {
      await using fixture = await createFixture({
        "apps/ghost": {},
      });

      expect(
        getScripts(fixture.path, { name: "@myapp/ghost", dir: "apps/ghost" })
      ).toEqual([]);
    });
  });

  describe(isRootPackage, () => {
    it.each([
      [ROOT_PACKAGE, true],
      [{ name: "@myapp/web", dir: "apps/web" }, false],
    ])("returns %s for %o", (pkg, expected) => {
      expect(isRootPackage(pkg)).toBe(expected);
    });
  });

  describe(matchPackages, () => {
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
