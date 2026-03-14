import { createFixture } from "fs-fixture";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "./history.js";
import { loadHistory, saveHistory } from "./history.js";

describe("history", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("loadHistory", () => {
    it("returns [] when file does not exist", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      expect(loadHistory()).toEqual([]);
    });

    it("returns [] when file contains invalid JSON", async () => {
      await using fixture = await createFixture({
        state: {
          prw: {
            "history.json": "not-valid-json",
          },
        },
      });
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      expect(loadHistory()).toEqual([]);
    });

    it("returns [] when file contains non-array JSON", async () => {
      await using fixture = await createFixture({
        state: {
          prw: {
            "history.json": JSON.stringify({ foo: "bar" }),
          },
        },
      });
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      expect(loadHistory()).toEqual([]);
    });

    it("returns parsed entries when file is valid", async () => {
      const entries = [{ package: "@myapp/web", script: "dev", timestamp: 1 }];
      await using fixture = await createFixture({
        state: {
          prw: {
            "history.json": JSON.stringify(entries),
          },
        },
      });
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      expect(loadHistory()).toEqual(entries);
    });

    it("prefers XDG_STATE_HOME when reading history", async () => {
      const xdgEntries = [
        { package: "@myapp/web", script: "dev", timestamp: 1 },
      ];
      const homeEntries = [
        { package: "@myapp/api", script: "build", timestamp: 2 },
      ];

      await using xdgFixture = await createFixture({
        state: {
          prw: {
            "history.json": JSON.stringify(xdgEntries),
          },
        },
      });
      await using homeFixture = await createFixture({
        ".local": {
          state: {
            prw: {
              "history.json": JSON.stringify(homeEntries),
            },
          },
        },
      });

      vi.stubEnv("XDG_STATE_HOME", xdgFixture.getPath("state"));
      vi.stubEnv("HOME", homeFixture.path);

      expect(loadHistory()).toEqual(xdgEntries);
    });

    it("falls back to the XDG state default when XDG_STATE_HOME is unset", async () => {
      const entries = [{ package: "@myapp/web", script: "dev", timestamp: 1 }];
      await using fixture = await createFixture({
        ".local": {
          state: {
            prw: {
              "history.json": JSON.stringify(entries),
            },
          },
        },
      });
      vi.stubEnv("HOME", fixture.path);

      expect(loadHistory()).toEqual(entries);
    });
  });

  describe("saveHistory", () => {
    it("deduplicates and moves existing entry to front", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      const existing = [
        { package: "@myapp/api", script: "dev", timestamp: 1 },
        { package: "@myapp/web", script: "dev", timestamp: 2 },
      ];

      saveHistory(
        { package: "@myapp/api", script: "dev", timestamp: 999 },
        existing
      );

      const written = await fixture.readJson<HistoryEntry[]>(
        "state/prw/history.json"
      );
      expect(written[0]).toEqual({
        package: "@myapp/api",
        script: "dev",
        timestamp: 999,
      });
      expect(written).toHaveLength(2);
    });

    it("truncates to 50 entries", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      const existing = Array.from({ length: 50 }, (_, i) => ({
        package: `@pkg${i}`,
        script: "test",
        timestamp: i,
      }));

      saveHistory(
        { package: "new-pkg", script: "test", timestamp: 999 },
        existing
      );

      const written = await fixture.readJson<HistoryEntry[]>(
        "state/prw/history.json"
      );
      expect(written).toHaveLength(50);
      expect(written[0]).toMatchObject({ package: "new-pkg" });
    });

    it("does not throw when write fails", async () => {
      await using fixture = await createFixture({
        state: {
          prw: "not-a-directory",
        },
      });
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      expect(() =>
        saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 }, [])
      ).not.toThrow();
    });

    it("writes to XDG_STATE_HOME when set", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 }, []);

      expect(await fixture.exists("state/prw/history.json")).toBe(true);
      expect(
        await fixture.readJson<HistoryEntry[]>("state/prw/history.json")
      ).toEqual([{ package: "@myapp/web", script: "dev", timestamp: 1 }]);
    });

    it("falls back to the XDG state default when XDG_STATE_HOME is unset", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("HOME", fixture.path);

      saveHistory({ package: "@myapp/web", script: "dev", timestamp: 1 }, []);

      expect(await fixture.exists(".local/state/prw/history.json")).toBe(true);
      expect(
        await fixture.readJson<HistoryEntry[]>(".local/state/prw/history.json")
      ).toEqual([{ package: "@myapp/web", script: "dev", timestamp: 1 }]);
    });
  });
});
