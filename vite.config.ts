import { defineConfig } from 'vite-plus';
import type { OxlintConfig } from 'vite-plus/lint';
import { readFileSync } from 'node:fs';
import { parse } from 'jsonc-parser';

const ultraciteOxlintCoreConfig = parse(
  readFileSync(
    new URL(
      'node_modules/ultracite/config/oxlint/core/.oxlintrc.json',
      import.meta.url
    ),
    'utf8'
  )
) as OxlintConfig;

export default defineConfig({
  fmt: {
    arrowParens: 'always',
    bracketSpacing: true,
    ignorePatterns: ['example/**'],
    printWidth: 80,
    proseWrap: 'never',
    semi: true,
    singleQuote: true,
    sortPackageJson: true,
    tabWidth: 2,
    trailingComma: 'es5',
    useTabs: false,
  },
  lint: {
    extends: [ultraciteOxlintCoreConfig],
    ignorePatterns: ['example/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  pack: {
    entry: {
      bin: 'src/bin.ts',
    },
  },
  test: {
    coverage: {
      exclude: ['src/**/*.test.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    environment: 'node',
    globals: true,
  },
});
