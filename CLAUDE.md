# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build          # Build with tsdown (outputs dist/bin.mjs)
pnpm test           # vitest watch mode
pnpm test:coverage  # vitest run --coverage
pnpm typecheck      # tsgo --noEmit
pnpm check          # biome lint+format check
pnpm fix            # biome lint+format auto-fix
pnpm knip           # detect unused exports/dependencies
```

Run a single test file:
```bash
pnpm vitest run src/sort.test.ts
```

## Conventions

- `findWorkspaceRoot` only checks the current directory — no parent traversal. Must be run from the workspace root.
- History is stored at `~/.config/prw/history.json` (max 50 entries), not in the project directory.

## Release

Uses Changesets. Always run `pnpm changeset` before merging feature PRs — skipping this requires manually editing `CHANGELOG.md` and `package.json` after the fact.
