"@nyatinte/prw": patch
---

Support XDG base directories for history storage.

`prw` now prefers `$XDG_STATE_HOME/prw/history.json`, falls back to
`$XDG_CONFIG_HOME/prw/history.json`, and keeps `~/.config/prw/history.json`
as the final fallback for compatibility.
