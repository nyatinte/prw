---
"@nyatinte/prw": patch
---

Fix signal-killed child process treated as success and unhandled rejection in bin.ts

- `runner.ts`: exit with code 1 when `spawnSync` returns a non-null `signal` (e.g. SIGINT from Ctrl+C), instead of silently exiting 0
- `bin.ts`: chain `.catch()` on `main()` so unexpected rejections are logged and cause a non-zero exit instead of an unhandled promise rejection
