# Example Workspaces

These example directories demonstrate how `@nyatinte/prw` works with different pnpm workspace configurations.

## 1. `simple/` - Minimal workspace

A simple workspace with 2 packages:

- `@simple/web` - Frontend app
- `@simple/api` - Backend app

```bash
cd simple
pnpm prw          # Interactive selection
pnpm prw web dev  # Select @simple/web and run dev
```

## 2. `large/` - Full-scale workspace

A realistic workspace with 5 applications and 5 shared packages:

**Applications (apps/):**

- `@large/web` - Main web frontend
- `@large/api` - API server
- `@large/mobile` - Mobile app
- `@large/admin` - Admin dashboard
- `@large/dashboard` - Monitoring dashboard

**Shared packages (packages/):**

- `@large/ui` - UI component library
- `@large/config` - Shared configuration
- `@large/logger` - Logging utility
- `@large/utils` - Common utilities
- `@large/types` - Shared TypeScript types

```bash
cd large
pnpm prw            # See all 10 packages
pnpm prw web        # Match @large/web
pnpm prw api build  # Run build on @large/api
pnpm prw ui build   # Shared package build
```

## 3. `edge-cases/` - Edge case handling

Tests how prw handles unusual configurations:

**Edge cases included:**

- `apps/unnamed/` - Package with no name field (uses `apps/unnamed` as fallback)
- `apps/no-scripts/` - Package with empty scripts
- `packages/minimal/` - Package with only `build` script
- Root with no name field

```bash
cd edge-cases
pnpm prw          # Root has no name, packages fallback to dirs
pnpm prw unnamed  # Tests dir fallback
```

## Testing prw

To test `@nyatinte/prw` with these examples:

```bash
# From repo root — build first
pnpm build

# Test with simple
cd example/simple
pnpm prw             # interactive
pnpm prw web dev     # direct

# Test with large
cd ../large
pnpm prw api build

# Test with edge cases
cd ../edge-cases
pnpm prw
```
