# @nyatinte/prw

English | [日本語](./README.ja.md)

[![CI](https://github.com/nyatinte/prw/actions/workflows/ci.yml/badge.svg)](https://github.com/nyatinte/prw/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/%40nyatinte%2Fprw)](https://npmx.dev/package/@nyatinte/prw#downloads)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

`prw` is a CLI for selecting a package and running one of its scripts from a pnpm workspace.

<table>
  <tr>
    <td width="50%">
      <img src="https://cdn.jsdelivr.net/gh/nyatinte/prw@main/.github/assets/readme-package-picker.webp" alt="Package picker filtered by package name" width="100%" />
    </td>
    <td width="50%">
      <img src="https://cdn.jsdelivr.net/gh/nyatinte/prw@main/.github/assets/readme-script-picker.webp" alt="Script picker after selecting a package" width="100%" />
    </td>
  </tr>
  <tr>
    <td align="center"><small>Filter packages with a short query.</small></td>
    <td align="center"><small>Pick a script and run it immediately.</small></td>
  </tr>
</table>

At a glance: run `prw`, narrow down the target package, choose a script, and execute an existing workspace task from anywhere inside the workspace.

> [!IMPORTANT]
> `prw` is intentionally small.
> It only runs scripts that already exist in your workspace.
> It does not add its own task system.

## What It Does

`prw` lets you pick a package and a script from your pnpm workspace, then runs it.
It only uses scripts already defined in `package.json`.

## Installation

```bash
npm install -g @nyatinte/prw
# or
pnpm add -g @nyatinte/prw
```

## Usage

### 1. Start without arguments

```bash
prw
```

Pick a package, pick a script, and run it.
You can also select the workspace root package.

### 2. Pass a package first

```bash
prw web
```

Package names can be matched loosely.
You do not need to type the full name every time.
If only one package matches, `prw` goes straight to script selection.
If multiple packages match, it shows the package picker.
Frequently used packages are shown first.

### 3. Pass both package and script

```bash
prw @myapp/web dev
```

If the package and script are clear, `prw` runs them directly.
Only scripts defined in `package.json` are runnable.
Frequently used scripts are shown first.

> [!NOTE]
> Short input like `prw web` is enough in many cases.

## Example

```text
$ prw
? Select package
❯ (root)
  @myapp/web      apps/web
  @myapp/api      apps/api

? Select script
❯ dev
  build
  test
```

## Workspace Layout

```text
.
├─ package.json
├─ pnpm-workspace.yaml
├─ apps/
│  └─ web/
│     └─ package.json
└─ packages/
   ├─ ui/
   │  └─ package.json
   └─ config/
      └─ package.json
```

From anywhere in the workspace, `prw` can run scripts from `apps/*` and `packages/*`.

## Notes

> [!IMPORTANT]
> Run `prw` anywhere inside the workspace.
> It finds the nearest `pnpm-workspace.yaml` by walking up parent directories.

> [!NOTE]
> Usage history is stored per workspace at `$XDG_STATE_HOME/prw/histories/<workspace-id>.json`
> (or `~/.local/state/prw/histories/<workspace-id>.json` when `XDG_STATE_HOME` is unset).
> `<workspace-id>` is a SHA-256 hash of the resolved workspace root path.

## License

MIT
