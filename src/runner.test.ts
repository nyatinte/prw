import { afterEach, describe, expect, it, vi } from "vitest";
import { runScript } from "./runner";
import type { Package } from "./workspace";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from "node:child_process";

describe("runner", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs script with --filter for regular package", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any);

    const pkg: Package = { name: "@myapp/web", dir: "apps/web" };
    runScript(pkg, "dev");

    expect(spawnSync).toHaveBeenCalledWith(
      "pnpm",
      ["--filter", "@myapp/web", "run", "dev"],
      { stdio: "inherit" }
    );
  });

  it("runs script without --filter for root package", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any);

    const pkg: Package = { name: "(root)", dir: "." };
    runScript(pkg, "build");

    expect(spawnSync).toHaveBeenCalledWith("pnpm", ["run", "build"], {
      stdio: "inherit",
    });
  });

  it("exits with non-zero status when script fails", () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any);

    const pkg: Package = { name: "@myapp/web", dir: "apps/web" };
    runScript(pkg, "test");

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("exits with code 1 when pnpm command is not found", () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.mocked(spawnSync).mockReturnValue({
      error: new Error("ENOENT"),
      status: null,
    } as any);

    const pkg: Package = { name: "@myapp/web", dir: "apps/web" };
    runScript(pkg, "dev");

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
