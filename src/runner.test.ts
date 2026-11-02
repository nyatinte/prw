import type { SpawnSyncReturns } from "node:child_process";

import { runScript } from "./runner.js";
import type { Package } from "./workspace.js";

vi.mock<typeof import("node:child_process")>(
  import("node:child_process"),
  () => ({
    spawnSync: vi.fn<typeof import("node:child_process").spawnSync>(),
  })
);

import { spawnSync } from "node:child_process";

function mockSpawnResult(
  partial: Partial<SpawnSyncReturns<Buffer>>
): SpawnSyncReturns<Buffer> {
  return {
    output: [],
    pid: 0,
    signal: null,
    status: 0,
    stderr: Buffer.from(""),
    stdout: Buffer.from(""),
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
    const pkg: Package = { dir: "apps/web", name: "@myapp/web" };
    runScript("/repo", pkg, "dev");

    expect(spawnSync).toHaveBeenCalledWith(
      "pnpm",
      ["--filter", "@myapp/web", "run", "dev"],
      { cwd: "/repo", stdio: "inherit" }
    );
  });

  it("runs script without --filter for root package", () => {
    const pkg: Package = { dir: ".", name: "(root)" };
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
      mockSpawnResult({ signal: "SIGINT", status: null }),
    ],
  ])("exits with code 1 when %s", (_, spawnResult) => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockReturnValue(undefined as never);
    vi.mocked(spawnSync).mockReturnValue(spawnResult);

    runScript("/repo", { dir: "apps/web", name: "@myapp/web" }, "dev");

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
