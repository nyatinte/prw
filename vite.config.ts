import { defineConfig } from 'vite-plus';
import { type OxlintConfig } from 'vite-plus/lint';
import { readFileSync } from 'node:fs';
import { parse } from "jsonc-parser";

const ultraciteOxlintCoreConfig = parse(
  readFileSync(new URL('./node_modules/ultracite/config/oxlint/core/.oxlintrc.json', import.meta.url), 'utf-8')
) as OxlintConfig;

export default defineConfig({
  fmt: {
    ignorePatterns: ['example/**'],
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'always',
    proseWrap: 'never',
    printWidth: 80,
    sortPackageJson: true,
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
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
    environment: 'node',
  },
});
