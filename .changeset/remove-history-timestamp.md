---
"@nyatinte/prw": patch
---

Remove unused `timestamp` field from `HistoryEntry`. History entries are now `{ package: string; script: string }` only.
