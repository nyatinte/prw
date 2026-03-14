---
"@nyatinte/prw": minor
---

Support XDG base directories for history storage.

This is a breaking change.

`prw` now stores history in `$XDG_STATE_HOME/prw/history.json` and falls back to
`~/.local/state/prw/history.json` when `XDG_STATE_HOME` is unset. It no longer
uses `~/.config/prw/history.json`.
