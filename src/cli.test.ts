import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveScript, selectPackageByArgs } from "./cli";
import type { HistoryEntry } from "./history";
import type { Package } from "./workspace";

const packages: Package[] = [
  { name: "@myapp/api", dir: "apps/api" },
  { name: "@myapp/web", dir: "apps/web" },
  { name: "@myapp/web-admin", dir: "apps/web-admin" },
];

const history: HistoryEntry[] = [];

describe("selectPackageByArgs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process, "exit").mockImplementation((code?: string | number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  it("exits with code 1 when no packages match a single arg query", async () => {
    await expect(
      selectPackageByArgs(packages, history, ["nonexistent"])
    ).rejects.toThrow("process.exit(1)");
  });

  it("returns matched package and script for direct execution", async () => {
    const result = await selectPackageByArgs(packages, history, ["api", "dev"]);
    expect(result.pkg.name).toBe("@myapp/api");
    expect(result.script).toBe("dev");
  });

  it("exits with code 1 when no packages match direct execution args", async () => {
    await expect(
      selectPackageByArgs(packages, history, ["nonexistent", "dev"])
    ).rejects.toThrow("process.exit(1)");
  });

  it("exits with code 1 when direct execution args match multiple packages", async () => {
    await expect(
      selectPackageByArgs(packages, history, ["web", "dev"])
    ).rejects.toThrow("process.exit(1)");
  });
});

describe("resolveScript", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initialScript directly when provided", async () => {
    const pkg: Package = { name: "@myapp/api", dir: "apps/api" };
    const result = await resolveScript("/root", pkg, "dev", []);
    expect(result).toBe("dev");
  });
});
