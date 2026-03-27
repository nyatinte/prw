import { createFixture } from "fs-fixture";

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
        "apps/web/src": {},
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      });

      expect(findWorkspaceRoot(fixture.getPath("apps", "web", "src"))).toBe(
        fixture.path
      );
    });

    it("returns nearest workspace root when nested workspaces exist", async () => {
      await using fixture = await createFixture({
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
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
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
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
          },
          api: {
            "package.json": JSON.stringify({ name: "@myapp/api" }),
          },
        },
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      });

      const packages = await getPackages(fixture.path);
      expect(packages).toHaveLength(3);
      expect(packages[0]).toStrictEqual({ dir: ".", name: "(root)" });
      expect(packages.some((p) => p.name === "@myapp/web")).toBeTruthy();
      expect(packages.some((p) => p.name === "@myapp/api")).toBeTruthy();
    });

    it("uses dir as fallback when package.json has no name", async () => {
      await using fixture = await createFixture({
        apps: {
          unnamed: {
            "package.json": JSON.stringify({}),
          },
        },
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      });

      const packages = await getPackages(fixture.path);
      expect(packages.some((p) => p.name === "apps/unnamed")).toBeTruthy();
    });

    it.each([
      ["no packages match the glob", "packages:\n  - apps/*\n"],
      ["workspace yaml is empty", ""],
    ])("returns only root when %s", async (_, yaml) => {
      await using fixture = await createFixture({
        "pnpm-workspace.yaml": yaml,
      });

      const packages = await getPackages(fixture.path);
      expect(packages).toStrictEqual([{ dir: ".", name: "(root)" }]);
    });

    it("excludes directories matching negation pattern", async () => {
      await using fixture = await createFixture({
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
          },
          legacy: {
            "package.json": JSON.stringify({ name: "@myapp/legacy" }),
          },
        },
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - '!apps/legacy'\n",
      });

      const packages = await getPackages(fixture.path);
      expect(packages.some((p) => p.name === "@myapp/web")).toBeTruthy();
      expect(packages.some((p) => p.name === "@myapp/legacy")).toBeFalsy();
    });

    it("ignores packages matched inside node_modules", async () => {
      await using fixture = await createFixture({
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
            node_modules: {
              dep: {
                "package.json": JSON.stringify({ name: "@dep/should-ignore" }),
              },
            },
          },
        },
        "pnpm-workspace.yaml": `packages:
  - apps/**
`,
      });

      const packages = await getPackages(fixture.path);
      expect(packages.some((p) => p.name === "@myapp/web")).toBeTruthy();
      expect(packages.some((p) => p.name === "@dep/should-ignore")).toBeFalsy();
    });

    it("ignores node_modules directory entries themselves", async () => {
      await using fixture = await createFixture({
        apps: {
          web: {
            "package.json": JSON.stringify({ name: "@myapp/web" }),
            node_modules: {
              "package.json": JSON.stringify({
                name: "@dep/root-should-ignore",
              }),
            },
          },
        },
        "pnpm-workspace.yaml": `packages:
  - apps/**
`,
      });

      const packages = await getPackages(fixture.path);
      expect(
        packages.some((p) => p.name === "@dep/root-should-ignore")
      ).toBeFalsy();
    });

    it("handles multiple patterns", async () => {
      await using fixture = await createFixture({
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
        "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*\n",
      });

      const packages = await getPackages(fixture.path);
      expect(packages).toHaveLength(3);
      expect(packages.some((p) => p.name === "@myapp/web")).toBeTruthy();
      expect(packages.some((p) => p.name === "@myapp/ui")).toBeTruthy();
    });
  });

  describe(getScripts, () => {
    it("returns script names and commands from package.json", async () => {
      await using fixture = await createFixture({
        apps: {
          web: {
            "package.json": JSON.stringify({
              name: "@myapp/web",
              scripts: { build: "tsc", dev: "vite" },
            }),
          },
        },
      });

      expect(
        getScripts(fixture.path, { dir: "apps/web", name: "@myapp/web" })
      ).toStrictEqual([
        { command: "tsc", name: "build" },
        { command: "vite", name: "dev" },
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
        getScripts(fixture.path, { dir: "apps/api", name: "@myapp/api" })
      ).toStrictEqual([]);
    });

    it("returns empty array when package.json does not exist", async () => {
      await using fixture = await createFixture({
        "apps/ghost": {},
      });

      expect(
        getScripts(fixture.path, { dir: "apps/ghost", name: "@myapp/ghost" })
      ).toStrictEqual([]);
    });
  });

  describe(isRootPackage, () => {
    it.each([
      [ROOT_PACKAGE, true],
      [{ dir: "apps/web", name: "@myapp/web" }, false],
    ])("returns %s for %o", (pkg, expected) => {
      expect(isRootPackage(pkg)).toBe(expected);
    });
  });

  describe(matchPackages, () => {
    const packages = [
      { dir: "apps/api", name: "@myapp/api" },
      { dir: "apps/web", name: "@myapp/web" },
      { dir: "apps/web-admin", name: "@myapp/web-admin" },
    ];

    it.each([
      ["api", ["@myapp/api"]],
      ["API", ["@myapp/api"]],
      ["web", ["@myapp/web", "@myapp/web-admin"]],
      ["nonexistent", []],
    ])("matchPackages('%s') returns %j", (query, expectedNames) => {
      const result = matchPackages(packages, query);
      expect(result.map((p) => p.name)).toStrictEqual(expectedNames);
    });
  });
});
