import { describe, it, expect } from 'vitest';
import { sortPackages, sortScripts } from './ui';
import type { Package } from './workspace';
import type { HistoryEntry } from './history';

describe('ui', () => {
  describe('sortPackages', () => {
    it('prioritizes packages with history', () => {
      const packages: Package[] = [
        { name: '(root)', dir: '.' },
        { name: '@myapp/api', dir: 'apps/api' },
        { name: '@myapp/web', dir: 'apps/web' },
      ];

      const history: HistoryEntry[] = [
        { package: '@myapp/web', script: 'dev', timestamp: 2 },
      ];

      const result = sortPackages(packages, history);
      expect(result[0].name).toBe('@myapp/web');
    });

    it('sorts non-history packages alphabetically', () => {
      const packages: Package[] = [
        { name: '(root)', dir: '.' },
        { name: '@myapp/api', dir: 'apps/api' },
        { name: '@myapp/web', dir: 'apps/web' },
      ];

      const result = sortPackages(packages, []);
      expect(result[0].name).toBe('(root)');
      expect(result[1].name).toBe('@myapp/api');
      expect(result[2].name).toBe('@myapp/web');
    });
  });

  describe('sortScripts', () => {
    it('prioritizes scripts with history', () => {
      const scripts = ['build', 'dev', 'test'];
      const history: HistoryEntry[] = [
        { package: '@myapp/web', script: 'test', timestamp: 1 },
      ];

      const result = sortScripts(scripts, '@myapp/web', history);
      expect(result[0]).toBe('test');
    });

    it('sorts non-history scripts alphabetically', () => {
      const scripts = ['test', 'build', 'dev'];
      const result = sortScripts(scripts, '@myapp/web', []);
      expect(result).toEqual(['build', 'dev', 'test']);
    });
  });
});
