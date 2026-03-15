import type { SpawnSyncReturns } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runScript } from "./runner.js";
import type { Package } from "./workspace.js";

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
    runScript("/repo", pkg, "dev");

    expect(spawnSync).toHaveBeenCalledWith(
      "pnpm",
      ["--filter", "@myapp/web", "run", "dev"],
      { cwd: "/repo", stdio: "inherit" }
    );
  });

  it("runs script without --filter for root package", () => {
    const pkg: Package = { name: "(root)", dir: "." };
    runScript("/repo", pkg, "build");

    expect(spawnSync).toHaveBeenCalledWith("pnpm", ["run", "build"], {
      cwd: "/repo",
      stdio: "inherit",
    });
  });

  it.each([
    ["script fails with non-zero status", mockSpawnResult({ status: 1 })],
    [
      "pnpm command is not found",
      mockSpawnResult({ error: new Error("ENOENT"), status: null }),
    ],
    [
      "pnpm is killed by a signal",
      mockSpawnResult({ status: null, signal: "SIGINT" }),
    ],
  ])("exits with code 1 when %s", (_, spawnResult) => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    vi.mocked(spawnSync).mockReturnValue(spawnResult);

    runScript("/repo", { name: "@myapp/web", dir: "apps/web" }, "dev");

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
