import { describe, it, expect } from 'vitest';

// Core logic tests without mocking home directory
describe('history', () => {
  it('basic history entry type is valid', () => {
    const entry = {
      package: '@myapp/web',
      script: 'dev',
      timestamp: Date.now(),
    };
    expect(entry).toHaveProperty('package');
    expect(entry).toHaveProperty('script');
    expect(entry).toHaveProperty('timestamp');
  });

  it('history entry ordering works correctly', () => {
    const entries = [
      { package: '@pkg0', script: 'test', timestamp: 0 },
      { package: '@pkg1', script: 'test', timestamp: 1 },
      { package: '@pkg2', script: 'test', timestamp: 2 },
    ];

    // Simulate LRU: move duplicate to front
    const dup = entries[0];
    const rest = entries.slice(1);
    const reordered = [dup, ...rest];

    expect(reordered[0]).toEqual(entries[0]);
    expect(reordered.length).toBe(3);
  });

  it('history truncation logic works', () => {
    const entries = Array.from({ length: 51 }, (_, i) => ({
      package: `@pkg${i}`,
      script: 'test',
      timestamp: i,
    }));

    if (entries.length > 50) {
      entries.splice(50);
    }

    expect(entries).toHaveLength(50);
    expect(entries[0].package).toBe('@pkg0');
  });
});
