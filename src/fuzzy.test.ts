import { describe, it, expect } from 'vitest';
import { fuzzyFilter } from './fuzzy';

describe('fuzzy', () => {
  it('matches with substring', () => {
    const items = ['@myapp/web', '@myapp/web-admin', '@myapp/api'];
    const result = fuzzyFilter('web', items);
    expect(result).toContain('@myapp/web');
    expect(result).toContain('@myapp/web-admin');
  });

  it('filters out non-matching items', () => {
    const items = ['@myapp/web', '@myapp/web-admin', '@myapp/api'];
    const result = fuzzyFilter('adm', items);
    expect(result).toEqual(['@myapp/web-admin']);
  });

  it('returns all items for empty query', () => {
    const items = ['web', 'api', 'ui'];
    const result = fuzzyFilter('', items);
    expect(result).toEqual(items);
  });

  it('is case-insensitive', () => {
    const items = ['Dev', 'BUILD', 'Test'];
    const result = fuzzyFilter('dev', items);
    expect(result).toContain('Dev');
  });
});
