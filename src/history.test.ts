import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs");

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HistoryEntry } from "./history";
import { loadHistory, saveHistory } from "./history";

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
      const entries = [{ package: "@myapp/web", script: "dev", timestamp: 1 }];
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

  describe("saveHistory", () => {
    beforeEach(() => {
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(writeFileSync).mockReturnValue(undefined);
    });

    it("deduplicates and moves existing entry to front", () => {
      const existing = [
        { package: "@myapp/api", script: "dev", timestamp: 1 },
        { package: "@myapp/web", script: "dev", timestamp: 2 },
      ];

      saveHistory(
        { package: "@myapp/api", script: "dev", timestamp: 999 },
        existing
      );

      const written = getWrittenHistory();
      expect(written[0]).toEqual({
        package: "@myapp/api",
        script: "dev",
        timestamp: 999,
      });
      expect(written).toHaveLength(2);
    });

    it("truncates to 50 entries", () => {
      const existing = Array.from({ length: 50 }, (_, i) => ({
        package: `@pkg${i}`,
        script: "test",
        timestamp: i,
      }));

      saveHistory(
        { package: "new-pkg", script: "test", timestamp: 999 },
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
        saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 }, [])
      ).not.toThrow();
    });

    it("writes to XDG_STATE_HOME when set", () => {
      vi.stubEnv("XDG_STATE_HOME", "/tmp/state");

      saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 }, []);

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith("/tmp/state/prw", {
        recursive: true,
      });
      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
        "/tmp/state/prw/history.json",
        expect.any(String)
      );
    });

    it("falls back to the XDG state default when XDG_STATE_HOME is unset", () => {
      saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 }, []);

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
  });
});
