# Changesets

This repository uses Changesets to track release intent in committed files.

Common commands:

- `pnpm changeset` to add a release note for user-visible changes
- `pnpm version-packages` to apply pending version updates locally
- `pnpm release` to publish the currently versioned package to npm

The GitHub Actions release workflow creates or updates the release PR from pending
changesets, then publishes from `main` after that PR is merged.
