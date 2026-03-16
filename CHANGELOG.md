# @nyatinte/prw

## 0.4.1

### Patch Changes

- 427e62f: Ignore `node_modules` entries when matching workspace package globs to prevent dependency packages from being treated as workspace packages.

## 0.4.0

### Minor Changes

- 24619d7: Add built-in `-h`/`--help` and `-v`/`--version` CLI output, and ship a `man prw` manual page.

### Patch Changes

- 03f5bae: Scope saved history by workspace so package and script ordering does not leak across unrelated pnpm workspaces.

  History is now saved at `$XDG_STATE_HOME/prw/histories/<workspace-id>.json` (fallback: `~/.local/state/prw/histories/<workspace-id>.json`). `<workspace-id>` is a SHA-256 hash of the resolved workspace root path.

- 28f0f2f: Fix signal-killed child process treated as success and unhandled rejection in bin.ts

  - `runner.ts`: exit with code 1 when `spawnSync` returns a non-null `signal` (e.g. SIGINT from Ctrl+C), instead of silently exiting 0
  - `bin.ts`: chain `.catch()` on `main()` so unexpected rejections are logged and cause a non-zero exit instead of an unhandled promise rejection

- 025b71b: Remove unused `timestamp` field from `HistoryEntry`. History entries are now `{ package: string; script: string }` only.

## 0.3.0

### Minor Changes

- f28b13f: Allow `prw` to discover the nearest pnpm workspace root from nested directories and always run `pnpm` from that root.

### Patch Changes

- 223f2f6: Support running `prw` from workspace subdirectories by resolving the nearest pnpm workspace root before listing packages or running scripts.

  Improve the error shown when `prw` is started completely outside a pnpm workspace.

## 0.2.0

### Minor Changes

- 3f38be5: Support XDG base directories for history storage.

  This is a breaking change.

  `prw` now stores history in `$XDG_STATE_HOME/prw/history.json` and falls back to
  `~/.local/state/prw/history.json` when `XDG_STATE_HOME` is unset. It no longer
  uses `~/.config/prw/history.json`.

## 0.1.1

### Patch Changes

- a0e3266: add CLAUDE.md, AGENTS.md for Agentic Coding
- ccc6cfa: Replace `fast-glob` with `tinyglobby` and `js-yaml` with `yaml`.

  Keep workspace package discovery behavior compatible by normalizing matched directory paths.

## 0.1.0

### Features

- Interactive CLI for running scripts across pnpm workspaces — select package and script with keyboard navigation
- Package selection with history-based sorting: recently used packages appear at the top (LRU cache, max 50 entries)
- Script selection UI shows the actual command next to each script name for quick identification
- Fuzzy package matching: `prw <package>` narrows candidates and launches interactive script selection
- Direct execution mode: `prw <package> <script>` runs without any prompts
- Show selected package name in log output when fuzzy match resolves to a single result
- Workspace exclusion pattern support in `pnpm-workspace.yaml`
- Graceful error handling for cancelled prompts and missing workspace root

### Infrastructure

- TypeScript build pipeline with tsdown (ESM output)
- GitHub Actions CI workflow with test and lint checks
- Changesets-based release management with npm trusted publishing and provenance
- Biome for linting and formatting; Lefthook for git hooks
- Vitest with coverage reporting
- tsgo for fast type checking
- Knip for dead code detection
- Node version pinned via `.node-versions`
