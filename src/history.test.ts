import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs");

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    it("returns [] when file does not exist", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(loadHistory()).toEqual([]);
    });

    it("returns [] when file contains invalid JSON", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("not-valid-json" as any);
      expect(loadHistory()).toEqual([]);
    });

    it("returns parsed entries when file is valid", () => {
      const entries = [{ package: "@myapp/web", script: "dev", timestamp: 1 }];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(entries) as any);
      expect(loadHistory()).toEqual(entries);
    });
  });

  describe("saveHistory", () => {
    beforeEach(() => {
      vi.mocked(mkdirSync).mockReturnValue(undefined as any);
      vi.mocked(writeFileSync).mockReturnValue(undefined);
    });

    it("writes entry to file", () => {
      vi.mocked(existsSync).mockReturnValue(false);

      saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 });

      expect(writeFileSync).toHaveBeenCalled();
    });

    it("deduplicates and moves existing entry to front", () => {
      const existing = [
        { package: "@myapp/api", script: "dev", timestamp: 1 },
        { package: "@myapp/web", script: "dev", timestamp: 2 },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing) as any);

      saveHistory({ package: "@myapp/api", script: "dev", timestamp: 999 });

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
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing) as any);

      saveHistory({ package: "new-pkg", script: "test", timestamp: 999 });

      const written = getWrittenHistory();
      expect(written).toHaveLength(50);
      expect(written[0]).toMatchObject({ package: "new-pkg" });
    });
  });
});
