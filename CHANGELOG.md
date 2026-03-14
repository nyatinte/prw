# @nyatinte/prw

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
