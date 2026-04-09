---
"@nyatinte/prw": minor
---

Add standalone executable (`exe`) support powered by Node.js SEA via tsdown.

Running `pnpm build:exe` now produces self-contained binaries in `exe/` for all five targets — no Node.js installation required on the end-user's machine:

| File | Platform |
|---|---|
| `prw-linux-x64` | Linux x64 |
| `prw-linux-arm64` | Linux ARM64 |
| `prw-darwin-x64` | macOS Intel |
| `prw-darwin-arm64` | macOS Apple Silicon |
| `prw-win-x64.exe` | Windows x64 |

Each binary bundles the latest Node.js LTS runtime. The release workflow now automatically builds and attaches these executables to the GitHub Release whenever a version is published.
