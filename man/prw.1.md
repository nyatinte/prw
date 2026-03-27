# prw(1) -- interactive pnpm workspace package and script runner

## SYNOPSIS

`prw` [-h|--help] [-v|--version]<br> `prw` [PACKAGE [SCRIPT]]

## DESCRIPTION

**prw** is an interactive CLI for selecting and running scripts from packages in a pnpm monorepo.

When invoked without arguments, it presents an interactive package picker followed by a script picker. When a PACKAGE query is given, it substring-matches (case-insensitive) against workspace package names; if exactly one package matches, it is selected automatically. When both PACKAGE and SCRIPT are given, the script is executed directly without any interactive prompt.

Previously used package/script pairs are remembered and floated to the top of the picker lists.

## ARGUMENTS

- `PACKAGE`: A package name or fuzzy search query. Matched case-insensitively as a substring against all workspace package names. If the query is ambiguous, an interactive picker is shown for the filtered set.
- `SCRIPT`: The exact name of a script defined in the matched package's `package.json`.

## OPTIONS

- `-h, --help`: Print help and exit.
- `-v, --version`: Print version and exit.

## EXAMPLES

Launch the interactive package picker:

    prw

Show a script picker for packages matching `web`:

    prw web

Run the `dev` script in `@myapp/web` directly:

    prw @myapp/web dev

## FILES

- `$XDG_STATE_HOME/prw/histories/<workspace-id>.json`: Execution history (max 50 entries) scoped per workspace. Defaults to `~/.local/state/prw/histories/<workspace-id>.json` when `XDG_STATE_HOME` is not set. `<workspace-id>` is a SHA-256 hash of the resolved workspace root path.

## SEE ALSO

pnpm(1)
