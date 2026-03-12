import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs");

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { HistoryEntry } from "./history";
import { loadHistory, saveHistory } from "./history";

function getWrittenHistory(): HistoryEntry[] {
  return JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
}

describe("history", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loadHistory", () => {
    it.each([
      ["file does not exist", () => { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); }],
      ["file contains invalid JSON", () => "not-valid-json"],
      ["file contains non-array JSON", () => JSON.stringify({ foo: "bar" })],
    ])("returns [] when %s", (_, readImpl) => {
      vi.mocked(readFileSync).mockImplementation(readImpl as any);
      expect(loadHistory()).toEqual([]);
    });

    it("returns parsed entries when file is valid", () => {
      const entries = [{ package: "@myapp/web", script: "dev", timestamp: 1 }];
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(entries) as any);
      expect(loadHistory()).toEqual(entries);
    });
  });

  describe("saveHistory", () => {
    beforeEach(() => {
      vi.mocked(mkdirSync).mockReturnValue(undefined as any);
      vi.mocked(writeFileSync).mockReturnValue(undefined);
    });

    it("deduplicates and moves existing entry to front", () => {
      const existing = [
        { package: "@myapp/api", script: "dev", timestamp: 1 },
        { package: "@myapp/web", script: "dev", timestamp: 2 },
      ];

      saveHistory({ package: "@myapp/api", script: "dev", timestamp: 999 }, existing);

      const written = getWrittenHistory();
      expect(written[0]).toEqual({ package: "@myapp/api", script: "dev", timestamp: 999 });
      expect(written).toHaveLength(2);
    });

    it("truncates to 50 entries", () => {
      const existing = Array.from({ length: 50 }, (_, i) => ({
        package: `@pkg${i}`,
        script: "test",
        timestamp: i,
      }));

      saveHistory({ package: "new-pkg", script: "test", timestamp: 999 }, existing);

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
  });
});
