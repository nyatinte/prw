import { createHash } from "node:crypto";
import { symlinkSync } from "node:fs";
import { createFixture } from "fs-fixture";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "./history.js";
import { getWorkspaceId, loadHistory, saveHistory } from "./history.js";

describe("history", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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
      const entries: HistoryEntry[] = [
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ];
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
      const xdgEntries: HistoryEntry[] = [
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ];
      const homeEntries: HistoryEntry[] = [
        {
          workspaceId: "workspace-b",
          package: "@myapp/api",
          script: "build",
          timestamp: 2,
        },
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
      const entries: HistoryEntry[] = [
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ];
      await using fixture = await createFixture({
        ".local": {
          state: {
            prw: {
              "history.json": JSON.stringify(entries),
            },
          },
        },
      });
      vi.stubEnv("XDG_STATE_HOME", "");
      vi.stubEnv("HOME", fixture.path);

      expect(loadHistory()).toEqual(entries);
    });
  });

  describe("getWorkspaceId", () => {
    it("hashes the canonical workspace path", async () => {
      await using fixture = await createFixture({
        real: {},
      });
      symlinkSync(fixture.getPath("real"), fixture.getPath("symlink"));

      const expected = createHash("sha256")
        .update(fixture.getPath("real"))
        .digest("hex");

      expect(getWorkspaceId(fixture.getPath("symlink"))).toBe(expected);
    });
  });

  describe("saveHistory", () => {
    it("deduplicates and moves existing entry to front", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      const existing: HistoryEntry[] = [
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

      const written = await fixture.readJson<HistoryEntry[]>(
        "state/prw/history.json"
      );
      expect(written[0]).toEqual({
        workspaceId: "workspace-a",
        package: "@myapp/api",
        script: "dev",
        timestamp: 999,
      });
      expect(written).toHaveLength(2);
    });

    it("truncates to 50 entries", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      const existing: HistoryEntry[] = Array.from({ length: 50 }, (_, i) => ({
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

    it("writes to XDG_STATE_HOME when set", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
        []
      );

      expect(await fixture.exists("state/prw/history.json")).toBe(true);
      expect(
        await fixture.readJson<HistoryEntry[]>("state/prw/history.json")
      ).toEqual([
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ]);
    });

    it("falls back to the XDG state default when XDG_STATE_HOME is unset", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", "");
      vi.stubEnv("HOME", fixture.path);

      saveHistory(
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
        []
      );

      expect(await fixture.exists(".local/state/prw/history.json")).toBe(true);
      expect(
        await fixture.readJson<HistoryEntry[]>(".local/state/prw/history.json")
      ).toEqual([
        {
          workspaceId: "workspace-a",
          package: "@myapp/web",
          script: "dev",
          timestamp: 1,
        },
      ]);
    });

    it("keeps matching package/script history from other workspaces", async () => {
      await using fixture = await createFixture();
      vi.stubEnv("XDG_STATE_HOME", fixture.getPath("state"));

      const existing: HistoryEntry[] = [
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

      expect(
        await fixture.readJson<HistoryEntry[]>("state/prw/history.json")
      ).toEqual([
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
