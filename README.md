# @nyatinte/prw

English | [日本語](./README.ja.md)

[![CI](https://github.com/nyatinte/prw/actions/workflows/ci.yml/badge.svg)](https://github.com/nyatinte/prw/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/%40nyatinte%2Fprw)](https://npmx.dev/package/@nyatinte/prw#downloads)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

`prw` is a CLI for interactively selecting a package and script in a pnpm workspace and running it. It only uses existing `package.json` scripts — no extra config files required.

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
    <td align="center"><small>Filter packages with fuzzy search.</small></td>
    <td align="center"><small>Pick a script and run it immediately.</small></td>
  </tr>
</table>

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

Interactively select a package and script, then run it.
The root package is also available.

### 2. Pass a package name

```bash
prw web
```

Package names are matched with fuzzy search.
If one package matches, it goes straight to script selection. If multiple match, the package picker is shown.
Frequently used packages are shown first based on history.

### 3. Pass both package and script

```bash
prw @myapp/web dev
```

If both are unambiguous, `prw` skips the selection screens and runs immediately.
Frequently used scripts are also shown first based on history.

> [!NOTE]
> You don't need to type the full package name every time.
> A short query like `prw web` is usually enough.

## Example

```text
$ prw
│
◆  Select package
│
│  Search: _
│  ● (root)
│  ○ @myapp/web
│  ○ @myapp/api
│  ↑/↓ to select • Enter: confirm • Type: to search
└
```

After selecting a package, you move on to script selection. The focused script shows its full command in `(...)`.

```text
│
◇  Select package
│  @myapp/web
│
◆  Select script
│
│  Search: _
│  ● dev (vite)
│  ○ build
│  ○ test
│  ↑/↓ to select • Enter: confirm • Type: to search
└
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

With a monorepo like this, you can run scripts from anywhere under apps/ or packages/, from anywhere in the workspace.

## Spec

> [!IMPORTANT]
> `prw` can be run from anywhere inside the workspace.
> It walks up parent directories to find the nearest `pnpm-workspace.yaml`.

> [!NOTE]
> Usage history is stored per workspace at `$XDG_STATE_HOME/prw/histories/<workspace-id>.json`
> (or `~/.local/state/prw/histories/<workspace-id>.json` when `XDG_STATE_HOME` is unset).
> `<workspace-id>` is a SHA-256 hash of the resolved workspace root path.

## License

MIT
