import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Package } from './workspace';
import { runScript } from './runner';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'child_process';

describe('runner', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('runs script with --filter for regular package', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any);

    const pkg: Package = { name: '@myapp/web', dir: 'apps/web' };
    runScript(pkg, 'dev');

    expect(spawnSync).toHaveBeenCalledWith('pnpm', [
      '--filter',
      '@myapp/web',
      'run',
      'dev',
    ], { stdio: 'inherit' });
  });

  it('runs script without --filter for root package', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as any);

    const pkg: Package = { name: '(root)', dir: '.' };
    runScript(pkg, 'build');

    expect(spawnSync).toHaveBeenCalledWith('pnpm', [
      'run',
      'build',
    ], { stdio: 'inherit' });
  });

  it('exits with non-zero status when script fails', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any);

    const pkg: Package = { name: '@myapp/web', dir: 'apps/web' };
    runScript(pkg, 'test');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
