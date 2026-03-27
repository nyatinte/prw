import { createHash } from 'node:crypto';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { createFixture } from 'fs-fixture';

import type { HistoryEntry } from './history.js';
import {
  getWorkspaceId,
  loadHistory,
  resolveHistoryFile,
  saveHistory,
} from './history.js';

describe('history', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe(loadHistory, () => {
    it('returns [] when file does not exist', async () => {
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));

      expect(loadHistory(fixture.getPath('workspace'))).toStrictEqual([]);
    });

    it('returns [] when file contains invalid JSON', async () => {
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));
      const historyFile = resolveHistoryFile(fixture.getPath('workspace'));
      mkdirSync(dirname(historyFile), { recursive: true });
      writeFileSync(historyFile, 'not-valid-json');

      expect(loadHistory(fixture.getPath('workspace'))).toStrictEqual([]);
    });

    it('returns [] when file contains non-array JSON', async () => {
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));
      const historyFile = resolveHistoryFile(fixture.getPath('workspace'));
      mkdirSync(dirname(historyFile), { recursive: true });
      writeFileSync(historyFile, JSON.stringify({ foo: 'bar' }));

      expect(loadHistory(fixture.getPath('workspace'))).toStrictEqual([]);
    });

    it('returns parsed entries when file is valid', async () => {
      const entries: HistoryEntry[] = [
        { package: '@myapp/web', script: 'dev' },
      ];
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));
      const historyFile = resolveHistoryFile(fixture.getPath('workspace'));
      mkdirSync(dirname(historyFile), { recursive: true });
      writeFileSync(historyFile, JSON.stringify(entries));

      expect(loadHistory(fixture.getPath('workspace'))).toStrictEqual(entries);
    });

    it('prefers XDG_STATE_HOME when reading history', async () => {
      const xdgEntries: HistoryEntry[] = [
        { package: '@myapp/web', script: 'dev' },
      ];
      const homeEntries: HistoryEntry[] = [
        { package: '@myapp/api', script: 'build' },
      ];

      await using xdgFixture = await createFixture({
        workspace: {},
      });
      await using homeFixture = await createFixture({
        home: {},
      });
      const workspaceRoot = xdgFixture.getPath('workspace');

      vi.stubEnv('XDG_STATE_HOME', xdgFixture.getPath('state'));
      const xdgHistoryFile = resolveHistoryFile(workspaceRoot);

      vi.stubEnv('XDG_STATE_HOME', '');
      vi.stubEnv('HOME', homeFixture.getPath('home'));
      const homeHistoryFile = resolveHistoryFile(workspaceRoot);

      mkdirSync(dirname(xdgHistoryFile), { recursive: true });
      writeFileSync(xdgHistoryFile, JSON.stringify(xdgEntries));
      mkdirSync(dirname(homeHistoryFile), { recursive: true });
      writeFileSync(homeHistoryFile, JSON.stringify(homeEntries));

      vi.stubEnv('XDG_STATE_HOME', xdgFixture.getPath('state'));

      expect(loadHistory(workspaceRoot)).toStrictEqual(xdgEntries);
    });

    it('falls back to the XDG state default when XDG_STATE_HOME is unset', async () => {
      const entries: HistoryEntry[] = [
        { package: '@myapp/web', script: 'dev' },
      ];
      await using fixture = await createFixture({
        home: {},
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', '');
      vi.stubEnv('HOME', fixture.getPath('home'));
      const historyFile = resolveHistoryFile(fixture.getPath('workspace'));
      mkdirSync(dirname(historyFile), { recursive: true });
      writeFileSync(historyFile, JSON.stringify(entries));

      expect(loadHistory(fixture.getPath('workspace'))).toStrictEqual(entries);
    });
  });

  describe(getWorkspaceId, () => {
    it('hashes the canonical workspace path', async () => {
      await using fixture = await createFixture({
        real: {},
      });
      symlinkSync(fixture.getPath('real'), fixture.getPath('symlink'));

      const expected = createHash('sha256')
        .update(fixture.getPath('real'))
        .digest('hex');

      expect(getWorkspaceId(fixture.getPath('symlink'))).toBe(expected);
    });

    it('returns different hashes for different workspace roots', async () => {
      await using fixture = await createFixture({
        'workspace-a': {},
        'workspace-b': {},
      });

      expect(getWorkspaceId(fixture.getPath('workspace-a'))).not.toBe(
        getWorkspaceId(fixture.getPath('workspace-b'))
      );
    });
  });

  describe(saveHistory, () => {
    it('deduplicates and moves existing entry to front', async () => {
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));

      const existing: HistoryEntry[] = [
        { package: '@myapp/api', script: 'dev' },
        { package: '@myapp/web', script: 'dev' },
      ];

      saveHistory(
        fixture.getPath('workspace'),
        { package: '@myapp/api', script: 'dev' },
        existing
      );

      const written = await fixture.readJson<HistoryEntry[]>(
        `state/prw/histories/${getWorkspaceId(fixture.getPath('workspace'))}.json`
      );
      expect(written[0]).toStrictEqual({
        package: '@myapp/api',
        script: 'dev',
      });
      expect(written).toHaveLength(2);
    });

    it('truncates to 50 entries', async () => {
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));

      const existing: HistoryEntry[] = Array.from({ length: 50 }, (_, i) => ({
        package: `@pkg${i}`,
        script: 'test',
      }));

      saveHistory(
        fixture.getPath('workspace'),
        { package: 'new-pkg', script: 'test' },
        existing
      );

      const written = await fixture.readJson<HistoryEntry[]>(
        `state/prw/histories/${getWorkspaceId(fixture.getPath('workspace'))}.json`
      );
      expect(written).toHaveLength(50);
      expect(written[0]).toMatchObject({ package: 'new-pkg' });
    });

    it('does not throw when write fails', async () => {
      await using fixture = await createFixture({
        state: {
          prw: {
            histories: 'not-a-directory',
          },
        },
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));

      expect(() => {
        saveHistory(
          fixture.getPath('workspace'),
          { package: '@myapp/web', script: 'dev' },
          []
        );
      }).not.toThrow();
    });

    it('writes to XDG_STATE_HOME when set', async () => {
      await using fixture = await createFixture({
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));

      saveHistory(
        fixture.getPath('workspace'),
        { package: '@myapp/web', script: 'dev' },
        []
      );

      const historyFile = `state/prw/histories/${getWorkspaceId(fixture.getPath('workspace'))}.json`;
      await expect(fixture.exists(historyFile)).resolves.toBe(true);
      await expect(
        fixture.readJson<HistoryEntry[]>(historyFile)
      ).resolves.toStrictEqual([{ package: '@myapp/web', script: 'dev' }]);
    });

    it('falls back to the XDG state default when XDG_STATE_HOME is unset', async () => {
      await using fixture = await createFixture({
        home: {},
        workspace: {},
      });
      vi.stubEnv('XDG_STATE_HOME', '');
      vi.stubEnv('HOME', fixture.getPath('home'));

      saveHistory(
        fixture.getPath('workspace'),
        { package: '@myapp/web', script: 'dev' },
        []
      );

      const historyFile = `home/.local/state/prw/histories/${getWorkspaceId(fixture.getPath('workspace'))}.json`;
      await expect(fixture.exists(historyFile)).resolves.toBe(true);
      await expect(
        fixture.readJson<HistoryEntry[]>(historyFile)
      ).resolves.toStrictEqual([{ package: '@myapp/web', script: 'dev' }]);
    });

    it('stores separate history files for different workspaces', async () => {
      await using fixture = await createFixture({
        'workspace-a': {},
        'workspace-b': {},
      });
      vi.stubEnv('XDG_STATE_HOME', fixture.getPath('state'));

      saveHistory(
        fixture.getPath('workspace-a'),
        { package: '@myapp/web', script: 'dev' },
        []
      );
      saveHistory(
        fixture.getPath('workspace-b'),
        { package: '@myapp/web', script: 'dev' },
        []
      );

      const workspaceAHistoryFile = `state/prw/histories/${getWorkspaceId(fixture.getPath('workspace-a'))}.json`;
      const workspaceBHistoryFile = `state/prw/histories/${getWorkspaceId(fixture.getPath('workspace-b'))}.json`;
      await expect(
        fixture.readJson<HistoryEntry[]>(workspaceAHistoryFile)
      ).resolves.toStrictEqual([{ package: '@myapp/web', script: 'dev' }]);
      await expect(
        fixture.readJson<HistoryEntry[]>(workspaceBHistoryFile)
      ).resolves.toStrictEqual([{ package: '@myapp/web', script: 'dev' }]);
    });
  });
});
