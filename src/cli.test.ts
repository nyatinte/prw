import { beforeEach, describe, expect, it, vi } from "vitest";

// TODO: UI prompt i18n should be covered from a higher-level entrypoint/E2E test
// once the current test structure stops mocking ./ui.
vi.mock("@clack/prompts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clack/prompts")>();
  return {
    ...actual,
    isCancel: vi.fn(),
    log: {
      ...actual.log,
      message: vi.fn(),
    },
  };
});
vi.mock("./ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ui")>();
  return {
    ...actual,
    selectPackage: vi.fn(),
    selectScript: vi.fn(),
  };
});
vi.mock("./workspace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./workspace")>();
  return {
    ...actual,
    getScripts: vi.fn(),
  };
});

import { resolveScript, selectPackageByArgs } from "./cli";
import type { HistoryEntry } from "./history";
import { m } from "./i18n";
import { isCancel } from "@clack/prompts";
import { setLocale } from "./paraglide/runtime.js";
import { selectPackage, selectScript } from "./ui";
import type { Package } from "./workspace";
import { getScripts } from "./workspace";

const packages: Package[] = [
  { name: "@myapp/api", dir: "apps/api" },
  { name: "@myapp/web", dir: "apps/web" },
  { name: "@myapp/web-admin", dir: "apps/web-admin" },
];

const history: HistoryEntry[] = [];

function resetCliTestState(): void {
  vi.clearAllMocks();
  void setLocale("en", { reload: false });
  // UI helpers are mocked in this file, so cancellation is opt-in per test.
  vi.mocked(isCancel).mockReturnValue(false);
  vi.spyOn(process, "exit").mockImplementation((code?: string | number) => {
    throw new Error(`process.exit(${code})`);
  });
}

async function expectPackageSelectionError(
  args: string[],
  expectedMessage: string
): Promise<void> {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  await expect(selectPackageByArgs(packages, history, args)).rejects.toThrow(
    "process.exit(1)"
  );

  expect(errorSpy).toHaveBeenCalledWith(expectedMessage);
}

async function expectResolveScriptError(
  root: string,
  pkg: Package,
  expectedMessage: string
): Promise<void> {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  await expect(resolveScript(root, pkg, undefined, [])).rejects.toThrow(
    "process.exit(1)"
  );

  expect(errorSpy).toHaveBeenCalledWith(expectedMessage);
}

describe("selectPackageByArgs", () => {
  beforeEach(() => {
    resetCliTestState();
  });

  describe("prw <package> — single arg", () => {
    it("returns the matched package when exactly one matches", async () => {
      const result = await selectPackageByArgs(packages, history, ["api"]);
      expect(result.pkg.name).toBe("@myapp/api");
      expect(result.script).toBeUndefined();
    });

    it("exits with code 1 when no packages match", async () => {
      await expectPackageSelectionError(
        ["nonexistent"],
        m.no_packages_match({ query: "nonexistent" })
      );
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

    it("logs localized cancel message when package picker is cancelled", async () => {
      const cancelSymbol = Symbol("cancel");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.mocked(selectPackage).mockResolvedValue(cancelSymbol);
      vi.mocked(isCancel).mockImplementation((value) => value === cancelSymbol);

      await expect(selectPackageByArgs(packages, history, [])).rejects.toThrow(
        "process.exit(0)"
      );

      expect(logSpy).toHaveBeenCalledWith(m.cancelled());
    });
  });

  describe("prw <package> <script> — two args", () => {
    it("returns matched package and script for direct execution", async () => {
      const result = await selectPackageByArgs(packages, history, [
        "api",
        "dev",
      ]);
      expect(result.pkg.name).toBe("@myapp/api");
      expect(result.script).toBe("dev");
    });

    it("exits with code 1 when no packages match", async () => {
      await expectPackageSelectionError(
        ["nonexistent", "dev"],
        m.no_packages_match({ query: "nonexistent" })
      );
    });

    it("exits with code 1 when multiple packages match", async () => {
      await expectPackageSelectionError(
        ["web", "dev"],
        m.multiple_packages_match({ query: "web" })
      );
    });
  });
});

describe("resolveScript", () => {
  const pkg: Package = { name: "@myapp/api", dir: "apps/api" };

  beforeEach(() => {
    resetCliTestState();
  });

  it("returns initialScript directly when provided", async () => {
    const result = await resolveScript("/root", pkg, "dev", []);
    expect(result).toBe("dev");
  });

  it("calls selectScript when no initial script", async () => {
    vi.mocked(getScripts).mockReturnValue(["dev", "build"]);
    vi.mocked(selectScript).mockResolvedValue("dev");
    const result = await resolveScript("/root", pkg, undefined, []);
    expect(selectScript).toHaveBeenCalled();
    expect(result).toBe("dev");
  });

  it("exits with code 1 when no scripts available", async () => {
    vi.mocked(getScripts).mockReturnValue([]);
    await expectResolveScriptError(
      "/root",
      pkg,
      m.no_scripts_in_package({ packageName: pkg.name })
    );
  });
});
