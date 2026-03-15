# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build          # Build with tsdown (outputs dist/bin.mjs)
pnpm build:man      # Generate man page from man/prw.1.md
pnpm test           # Rebuild, then run Vitest in watch mode
pnpm test:run       # Rebuild, then run Vitest once without watch mode
pnpm test:coverage  # vitest run --coverage
pnpm test:update    # Rebuild, then update Vitest snapshots
pnpm typecheck      # tsgo --noEmit -p tsconfig.json
pnpm check          # ultracite check
pnpm fix            # ultracite fix
pnpm knip           # detect unused exports/dependencies
```

Run a single test file:
```bash
pnpm vitest run src/path/to/file.test.ts
pnpm vitest run test/prw.e2e.test.ts
```

For agent-driven verification, prefer non-interactive commands such as `pnpm test:run`, `pnpm test:coverage`, or `pnpm vitest run ...`. Use `pnpm test` only when watch mode is actually desired.

## Conventions

- `findWorkspaceRoot` traverses parent directories until it finds the nearest `pnpm-workspace.yaml`.
- `prw` always runs from the resolved workspace root, even when launched from a nested subdirectory.
- History is stored at `$XDG_STATE_HOME/prw/history.json` or `~/.local/state/prw/history.json` when `XDG_STATE_HOME` is unset.
- History is an LRU-style list capped at 50 entries.
- The workspace root package is always included as `(root)`.
- If a workspace package has no `name`, the package directory path is used as its fallback label.
- `pnpm-workspace.yaml` exclusion patterns are supported because package discovery uses the workspace `packages` globs directly.

## Release

Uses Changesets.

- Run `pnpm changeset` before merging feature PRs.
- `pnpm version-packages` applies pending changesets locally.
- `pnpm release` publishes via Changesets.
- `prepublishOnly` runs `pnpm build && pnpm build:man`, so release-related changes should keep the generated man page in sync.
