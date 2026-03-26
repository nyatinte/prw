import type { HistoryEntry } from "./history.js";
import { sortPackages, sortScripts } from "./sort.js";
import type { Package } from "./workspace.js";

describe(sortPackages, () => {
  it("prioritizes packages with history", () => {
    const packages: Package[] = [
      { dir: ".", name: "(root)" },
      { dir: "apps/api", name: "@myapp/api" },
      { dir: "apps/web", name: "@myapp/web" },
    ];

    const history: HistoryEntry[] = [{ package: "@myapp/web", script: "dev" }];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/web");
  });

  it("sorts non-history packages alphabetically", () => {
    const packages: Package[] = [
      { dir: ".", name: "(root)" },
      { dir: "apps/api", name: "@myapp/api" },
      { dir: "apps/web", name: "@myapp/web" },
    ];

    const result = sortPackages(packages, []);
    expect(result[0].name).toBe("(root)");
    expect(result[1].name).toBe("@myapp/api");
    expect(result[2].name).toBe("@myapp/web");
  });

  it("preserves history order when multiple packages have history", () => {
    const packages: Package[] = [
      { dir: "apps/api", name: "@myapp/api" },
      { dir: "apps/web", name: "@myapp/web" },
    ];

    const history: HistoryEntry[] = [
      { package: "@myapp/api", script: "dev" },
      { package: "@myapp/web", script: "dev" },
    ];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/api");
    expect(result[1].name).toBe("@myapp/web");
  });

  it("uses first occurrence when same package appears multiple times in history", () => {
    const packages: Package[] = [
      { dir: "apps/api", name: "@myapp/api" },
      { dir: "apps/web", name: "@myapp/web" },
    ];

    const history: HistoryEntry[] = [
      { package: "@myapp/web", script: "dev" },
      { package: "@myapp/api", script: "build" },
      { package: "@myapp/web", script: "build" },
    ];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/web");
    expect(result[1].name).toBe("@myapp/api");
  });
});

describe(sortScripts, () => {
  it("prioritizes scripts with history", () => {
    const scripts = [
      { command: "tsc", name: "build" },
      { command: "vite", name: "dev" },
      { command: "vitest", name: "test" },
    ];
    const history: HistoryEntry[] = [{ package: "@myapp/web", script: "test" }];

    const result = sortScripts(scripts, "@myapp/web", history);
    expect(result[0].name).toBe("test");
  });

  it("sorts non-history scripts alphabetically", () => {
    const scripts = [
      { command: "vitest", name: "test" },
      { command: "tsc", name: "build" },
      { command: "vite", name: "dev" },
    ];
    const result = sortScripts(scripts, "@myapp/web", []);
    expect(result.map((s) => s.name)).toStrictEqual(["build", "dev", "test"]);
  });
});
