import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs");

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HistoryEntry } from "./history.js";
import { getWorkspaceId, loadHistory, saveHistory } from "./history.js";

function getWrittenHistory(): HistoryEntry[] {
  return JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
}

function getDefaultHistoryFile(): string {
  return join(homedir(), ".local", "state", "prw", "history.json");
}

describe("history", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("loadHistory", () => {
    it.each([
      [
        "file does not exist",
        (): string => {
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        },
      ],
      ["file contains invalid JSON", (): string => "not-valid-json"],
      [
        "file contains non-array JSON",
        (): string => JSON.stringify({ foo: "bar" }),
      ],
    ])("returns [] when %s", (_, readImpl) => {
      vi.mocked(readFileSync).mockImplementation(readImpl);
      expect(loadHistory()).toEqual([]);
    });

    it("returns parsed entries when file is valid", () => {
      const entries: HistoryEntry[] = [
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(entries));
      expect(loadHistory()).toEqual(entries);
      expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(
        getDefaultHistoryFile(),
        "utf-8"
      );
    });

    it("prefers XDG_STATE_HOME when reading history", () => {
      vi.stubEnv("XDG_STATE_HOME", "/tmp/state");
      vi.mocked(readFileSync).mockReturnValue("[]");

      loadHistory();

      expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(
        "/tmp/state/prw/history.json",
        "utf-8"
      );
    });

    it("falls back to the XDG state default when XDG_STATE_HOME is unset", () => {
      vi.mocked(readFileSync).mockReturnValue("[]");

      loadHistory();

      expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(
        getDefaultHistoryFile(),
        "utf-8"
      );
    });
  });

  describe("getWorkspaceId", () => {
    it("hashes the canonical workspace path", () => {
      vi.mocked(realpathSync).mockReturnValue("/real/workspace");
      const expected = createHash("sha256")
        .update("/real/workspace")
        .digest("hex");

      expect(getWorkspaceId("/symlink/workspace")).toBe(expected);
      expect(vi.mocked(realpathSync)).toHaveBeenCalledWith(
        "/symlink/workspace"
      );
    });
  });

  describe("saveHistory", () => {
    beforeEach(() => {
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(writeFileSync).mockReturnValue(undefined);
    });

    it("deduplicates and moves existing entry to front", () => {
      const existing = [
        {
          workspaceId: "workspace-a",
          package: "@myapp/api",
          script: "dev",
          timestamp: 1,
        },
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 2,
        },
      ];

      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "@myapp/api",
          script: "dev",
          timestamp: 999,
        },
        existing
      );

      const written = getWrittenHistory();
      expect(written[0]).toEqual({
        workspaceId: "workspace-a",
        package: "@myapp/api",
        script: "dev",
        timestamp: 999,
      });
      expect(written).toHaveLength(2);
    });

    it("truncates to 50 entries", () => {
      const existing = Array.from({ length: 50 }, (_, i) => ({
        workspaceId: "workspace-a",
        package: `@pkg${i}`,
        script: "test",
        timestamp: i,
      }));

      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "new-pkg",
          script: "test",
          timestamp: 999,
        },
        existing
      );

      const written = getWrittenHistory();
      expect(written).toHaveLength(50);
      expect(written[0]).toMatchObject({ package: "new-pkg" });
    });

    it("does not throw when write fails", () => {
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error("ENOSPC: no space left on device");
      });

      expect(() =>
        saveHistory(
          {
            workspaceId: "workspace-a",
            package: "@myapp/web",
            script: "dev",
            timestamp: 1,
          },
          []
        )
      ).not.toThrow();
    });

    it("writes to XDG_STATE_HOME when set", () => {
      vi.stubEnv("XDG_STATE_HOME", "/tmp/state");

      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
        []
      );

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith("/tmp/state/prw", {
        recursive: true,
      });
      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
        "/tmp/state/prw/history.json",
        expect.any(String)
      );
    });

    it("falls back to the XDG state default when XDG_STATE_HOME is unset", () => {
      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
        []
      );

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith(
        join(homedir(), ".local", "state", "prw"),
        {
          recursive: true,
        }
      );
      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
        getDefaultHistoryFile(),
        expect.any(String)
      );
    });

    it("keeps matching package/script history from other workspaces", () => {
      const existing = [
        {
          workspaceId: "workspace-b",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ];

      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 2,
        },
        existing
      );

      expect(getWrittenHistory()).toEqual([
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 2,
        },
        {
          workspaceId: "workspace-b",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ]);
    });
  });
});
