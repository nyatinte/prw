import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
  findWorkspaceRoot,
  getPackages,
  WorkspaceNotFoundError,
} from './workspace';

describe('workspace', () => {
  const tmpDir = join('/tmp', 'prw-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('findWorkspaceRoot', () => {
    it('returns path with pnpm-workspace.yaml in current dir', () => {
      const root = tmpDir;
      writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

      const result = findWorkspaceRoot(root);
      expect(result).toBe(root);
    });

    it('returns path with pnpm-workspace.yaml in parent dir', () => {
      const root = tmpDir;
      writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

      const subdir = join(root, 'subdir');
      mkdirSync(subdir, { recursive: true });

      const result = findWorkspaceRoot(subdir);
      expect(result).toBe(root);
    });

    it('throws WorkspaceNotFoundError when not in workspace', () => {
      expect(() => findWorkspaceRoot(tmpDir)).toThrow(WorkspaceNotFoundError);
    });
  });

  describe('getPackages', () => {
    it('always returns root as first entry', async () => {
      const root = tmpDir;
      writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

      const packages = await getPackages(root);
      expect(packages[0]).toEqual({ name: '(root)', dir: '.' });
    });

    it('returns packages from glob pattern', async () => {
      const root = tmpDir;
      writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

      mkdirSync(join(root, 'apps', 'web'), { recursive: true });
      writeFileSync(
        join(root, 'apps', 'web', 'package.json'),
        JSON.stringify({ name: '@myapp/web' })
      );

      mkdirSync(join(root, 'apps', 'api'), { recursive: true });
      writeFileSync(
        join(root, 'apps', 'api', 'package.json'),
        JSON.stringify({ name: '@myapp/api' })
      );

      const packages = await getPackages(root);
      expect(packages.length).toBe(3);
      expect(packages[0]).toEqual({ name: '(root)', dir: '.' });
      expect(packages.some(p => p.name === '@myapp/web')).toBe(true);
      expect(packages.some(p => p.name === '@myapp/api')).toBe(true);
    });

    it('uses dir as fallback when package.json has no name', async () => {
      const root = tmpDir;
      writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

      mkdirSync(join(root, 'apps', 'unnamed'), { recursive: true });
      writeFileSync(
        join(root, 'apps', 'unnamed', 'package.json'),
        JSON.stringify({})
      );

      const packages = await getPackages(root);
      expect(packages.some(p => p.name === 'apps/unnamed')).toBe(true);
    });

    it('returns only root when no packages matched', async () => {
      const root = tmpDir;
      writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

      const packages = await getPackages(root);
      expect(packages).toEqual([{ name: '(root)', dir: '.' }]);
    });

    it('handles multiple patterns', async () => {
      const root = tmpDir;
      writeFileSync(
        join(root, 'pnpm-workspace.yaml'),
        'packages:\n  - apps/*\n  - packages/*\n'
      );

      mkdirSync(join(root, 'apps', 'web'), { recursive: true });
      writeFileSync(
        join(root, 'apps', 'web', 'package.json'),
        JSON.stringify({ name: '@myapp/web' })
      );

      mkdirSync(join(root, 'packages', 'ui'), { recursive: true });
      writeFileSync(
        join(root, 'packages', 'ui', 'package.json'),
        JSON.stringify({ name: '@myapp/ui' })
      );

      const packages = await getPackages(root);
      expect(packages.length).toBe(3);
      expect(packages.some(p => p.name === '@myapp/web')).toBe(true);
      expect(packages.some(p => p.name === '@myapp/ui')).toBe(true);
    });
  });
});
