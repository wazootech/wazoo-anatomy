# AGENTS.md

Agent guidelines for `wazoo-anatomy`. See `README.md` for what the repo is.

## Code health

Family-wide rules live in the [wazootech workspace constitution](https://github.com/wazootech/workspace/blob/main/AGENTS.md#code-health-standards); this repo's specifics:

- Before pushing, run `node scripts/build-site.mjs`, the same build CI runs before deploying to Pages. There is no formatter or test suite.
- `.github/workflows/secret-scan.yml` runs gitleaks on every PR and push to `main`.
- Actions in `.github/workflows/pages.yml` are pinned to commit SHAs; `renovate.json` keeps them current.
- `.github/CODEOWNERS` assigns `* @EthanThatOneKid`.
- `.github/workflows/code-health.yml` is warn-only (long files, TODO/FIXME without an issue link) and excludes `kit/`, the shipped code.
