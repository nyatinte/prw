import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ui");
vi.mock("./workspace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./workspace")>();
  return {
    ...actual,
    findWorkspaceRoot: vi.fn(),
    getPackages: vi.fn(),
    getScripts: vi.fn(),
  };
});
vi.mock("./history");
vi.mock("./runner");

import type { HistoryEntry } from "./history";
import { selectPackageByArgs } from "./index";
import { selectPackage } from "./ui";
import type { Package } from "./workspace";

const packages: Package[] = [
  { name: "@myapp/api", dir: "apps/api" },
  { name: "@myapp/web", dir: "apps/web" },
  { name: "@myapp/web-admin", dir: "apps/web-admin" },
];

const history: HistoryEntry[] = [];

describe("selectPackageByArgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation((code?: string | number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  describe("prw <package> — single arg", () => {
    it("returns the matched package when exactly one matches", async () => {
      const result = await selectPackageByArgs(packages, history, ["api"]);
      expect(result.pkg.name).toBe("@myapp/api");
      expect(result.script).toBe("");
    });

    it("exits with code 1 when no packages match", async () => {
      await expect(
        selectPackageByArgs(packages, history, ["nonexistent"])
      ).rejects.toThrow("process.exit(1)");
    });

    it("calls selectPackage UI when multiple packages match", async () => {
      vi.mocked(selectPackage).mockResolvedValue({
        name: "@myapp/web",
        dir: "apps/web",
      });
      const result = await selectPackageByArgs(packages, history, ["web"]);
      expect(selectPackage).toHaveBeenCalled();
      expect(result.pkg.name).toBe("@myapp/web");
    });
  });

  describe("prw <package> <script> — two args", () => {
    it("returns matched package and script for direct execution", async () => {
      const result = await selectPackageByArgs(packages, history, ["api", "dev"]);
      expect(result.pkg.name).toBe("@myapp/api");
      expect(result.script).toBe("dev");
    });

    it("exits with code 1 when no packages match", async () => {
      await expect(
        selectPackageByArgs(packages, history, ["nonexistent", "dev"])
      ).rejects.toThrow("process.exit(1)");
    });

    it("exits with code 1 when multiple packages match", async () => {
      await expect(
        selectPackageByArgs(packages, history, ["web", "dev"])
      ).rejects.toThrow("process.exit(1)");
    });
  });
});
