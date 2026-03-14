import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "./history.js";
import { sortPackages, sortScripts } from "./sort.js";
import type { Package } from "./workspace.js";

describe("sortPackages", () => {
  const workspaceId = "workspace-a";

  it("prioritizes packages with history", () => {
    const packages: Package[] = [
      { name: "(root)", dir: "." },
      { name: "@myapp/api", dir: "apps/api" },
      { name: "@myapp/web", dir: "apps/web" },
    ];

    const history: HistoryEntry[] = [
      { workspaceId, package: "@myapp/web", script: "dev", timestamp: 2 },
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
      { workspaceId, package: "@myapp/api", script: "dev", timestamp: 2 },
      { workspaceId, package: "@myapp/web", script: "dev", timestamp: 1 },
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
      { workspaceId, package: "@myapp/web", script: "dev", timestamp: 3 },
      { workspaceId, package: "@myapp/api", script: "build", timestamp: 2 },
      { workspaceId, package: "@myapp/web", script: "build", timestamp: 1 },
    ];

    const result = sortPackages(packages, history);
    expect(result[0].name).toBe("@myapp/web");
    expect(result[1].name).toBe("@myapp/api");
  });
});

describe("sortScripts", () => {
  const workspaceId = "workspace-a";

  it("prioritizes scripts with history", () => {
    const scripts = [
      { name: "build", command: "tsc" },
      { name: "dev", command: "vite" },
      { name: "test", command: "vitest" },
    ];
    const history: HistoryEntry[] = [
      { workspaceId, package: "@myapp/web", script: "test", timestamp: 1 },
    ];

    const result = sortScripts(scripts, "@myapp/web", history);
    expect(result[0].name).toBe("test");
  });

  it("sorts non-history scripts alphabetically", () => {
    const scripts = [
      { name: "test", command: "vitest" },
      { name: "build", command: "tsc" },
      { name: "dev", command: "vite" },
    ];
    const result = sortScripts(scripts, "@myapp/web", []);
    expect(result.map((s) => s.name)).toEqual(["build", "dev", "test"]);
  });
});
