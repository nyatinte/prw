import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "./history";
import { sortPackages, sortScripts } from "./sort";
import type { Package } from "./workspace";

describe("sortPackages", () => {
  it("prioritizes packages with history", () => {
    const packages: Package[] = [
      { name: "(root)", dir: "." },
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
    ];

    const history: HistoryEntry[] = [
      { package: "@myapp/web", script: "dev", timestamp: 2 },
    ];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/web");
  });

  it("sorts non-history packages alphabetically", () => {
    const packages: Package[] = [
      { name: "(root)", dir: "." },
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
    ];

    const result = sortPackages(packages, []);
    expect(result[0].name).toBe("(root)");
    expect(result[1].name).toBe("@myapp/api");
    expect(result[2].name).toBe("@myapp/web");
  });

  it("preserves history order when multiple packages have history", () => {
    const packages: Package[] = [
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
    ];

    const history: HistoryEntry[] = [
      { package: "@myapp/api", script: "dev", timestamp: 2 },
      { package: "@myapp/web", script: "dev", timestamp: 1 },
    ];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/api");
    expect(result[1].name).toBe("@myapp/web");
  });

  it("uses first occurrence when same package appears multiple times in history", () => {
    const packages: Package[] = [
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
    ];

    const history: HistoryEntry[] = [
      { package: "@myapp/web", script: "dev", timestamp: 3 },
      { package: "@myapp/api", script: "build", timestamp: 2 },
      { package: "@myapp/web", script: "build", timestamp: 1 },
    ];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/web");
    expect(result[1].name).toBe("@myapp/api");
  });
});

describe("sortScripts", () => {
  it("prioritizes scripts with history", () => {
    const scripts = ["build", "dev", "test"];
    const history: HistoryEntry[] = [
      { package: "@myapp/web", script: "test", timestamp: 1 },
    ];

    const result = sortScripts(scripts, "@myapp/web", history);
    expect(result[0]).toBe("test");
  });

  it("sorts non-history scripts alphabetically", () => {
    const scripts = ["test", "build", "dev"];
    const result = sortScripts(scripts, "@myapp/web", []);
    expect(result).toEqual(["build", "dev", "test"]);
  });
});
