import type { SpawnSyncReturns } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runScript } from "./runner";
import type { Package } from "./workspace";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from "node:child_process";

function mockSpawnResult(
  partial: Partial<SpawnSyncReturns<Buffer>>
): SpawnSyncReturns<Buffer> {
  return {
    pid: 0,
    output: [],
    stdout: Buffer.from(""),
    stderr: Buffer.from(""),
    status: 0,
    signal: null,
    ...partial,
  };
}

describe("runner", () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReturnValue(mockSpawnResult({ status: 0 }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs script with --filter for regular package", () => {
    const pkg: Package = { name: "@myapp/web", dir: "apps/web" };
    runScript(pkg, "dev");

    expect(spawnSync).toHaveBeenCalledWith(
      "pnpm",
      ["--filter", "@myapp/web", "run", "dev"],
      { stdio: "inherit" }
    );
  });

  it("runs script without --filter for root package", () => {
    const pkg: Package = { name: "(root)", dir: "." };
    runScript(pkg, "build");

    expect(spawnSync).toHaveBeenCalledWith("pnpm", ["run", "build"], {
      stdio: "inherit",
    });
  });

  it.each([
    ["script fails with non-zero status", mockSpawnResult({ status: 1 })],
    [
      "pnpm command is not found",
      mockSpawnResult({ error: new Error("ENOENT"), status: null }),
    ],
  ])("exits with code 1 when %s", (_, spawnResult) => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.mocked(spawnSync).mockReturnValue(spawnResult);

    runScript({ name: "@myapp/web", dir: "apps/web" }, "dev");

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
