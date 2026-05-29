# Release Workflow

This document is the single release path for SafeTS. Do not publish npm packages, GitHub releases, or Marketplace updates from memory.

## Release Policy

SafeTS follows semantic versioning:

- Patch releases fix bugs, false positives, packaging issues, documentation mistakes, or CI regressions.
- Minor releases add detectors, CLI options, JSON fields, GitHub Action inputs, or other backward-compatible features.
- Major releases may change CLI defaults, exit-code behavior, JSON schema semantics, baseline compatibility, detector confidence contracts, or supported runtime versions.

Before `1.0.0`, breaking changes may still happen, but every release should still document user-visible behavior changes clearly.

## Release Channels

- `latest`: stable npm releases that users should install by default.
- `next`: release candidates or validation builds before a stable release.
- Git tags use `vX.Y.Z`, matching `package.json`.
- GitHub Action users should pin a tag, for example `Dioman-Keita/safets@v1.0.0`.

## Pre-Release Checklist

Run this checklist before changing the version:

```bash
git switch main
git pull origin main
npm ci
npm run build
npm run typecheck
npm test
npm run pack:check
npm run validate:real-world
```

Confirm:

- CI is green on `main`.
- `npm run pack:check` lists only intentional package files.
- `npm run validate:real-world` passes all status and performance budgets.
- `README.md`, `ROADMAP.md`, and docs match the behavior being released.
- The GitHub Action examples reference the intended release tag.
- No open P0 or release-blocking P1 issues remain.

## Version Bump

Use npm's version command so `package.json` and `package-lock.json` stay aligned:

```bash
npm version patch --no-git-tag-version
# or
npm version minor --no-git-tag-version
# or
npm version major --no-git-tag-version
```

For a release candidate:

```bash
npm version 1.0.0-rc.1 --no-git-tag-version
```

After bumping, update docs that mention the version explicitly, especially GitHub Action examples.

Commit the bump:

```bash
git add package.json package-lock.json README.md docs
git commit -m "chore: release vX.Y.Z"
```

## Release Candidate Flow

Use this before `1.0.0` or any risky release:

```bash
npm publish --tag next --dry-run
npm publish --tag next
```

Then validate the published package from a clean project:

```bash
mkdir /tmp/safets-release-smoke
cd /tmp/safets-release-smoke
npm init -y
npm install --save-dev safets@next typescript
npx safets --version
npx safets doctor
```

For the GitHub Action, test a workflow that pins the candidate tag or branch before publishing Marketplace updates.

## Stable npm Publish

After the release commit is merged to `main`:

```bash
git switch main
git pull origin main
npm ci
npm run build
npm run typecheck
npm test
npm run pack:check
npm run validate:real-world
npm publish --dry-run
npm publish
```

If publishing a stable release after an RC, promote with:

```bash
npm dist-tag add safets@X.Y.Z latest
```

## Git Tag And GitHub Release

Create and push the release tag after npm publish succeeds:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Create a GitHub Release from the tag with:

- Summary of user-facing changes.
- Breaking changes, if any.
- Migration notes, if any.
- Validation commands that passed.
- npm package link.

## GitHub Marketplace

Publish or update the Marketplace listing only after:

- npm stable publish is complete.
- `vX.Y.Z` tag exists.
- The GitHub Action docs reference the same stable tag.
- A sample workflow using `Dioman-Keita/safets@vX.Y.Z` has passed.

Marketplace release notes should match the GitHub Release notes.

## Rollback

If npm publish succeeds but the release is broken:

1. Deprecate the bad version instead of unpublishing unless it is within npm's unpublish policy and no users are affected.
2. Move `latest` back to the previous stable version:

```bash
npm dist-tag add safets@PREVIOUS_VERSION latest
```

3. Open a hotfix issue and release a patch.
4. Update the GitHub Release notes with the known issue.

If a GitHub Action tag is wrong, do not move an existing release tag casually. Prefer publishing a patch tag and documenting the fix.

## v1.0.0 Readiness Gate

Do not publish `1.0.0` until:

- npm install works without `ts-node`.
- `safets doctor`, `baseline`, `debt`, `fix`, `--json`, and `--fail-on-new` are covered by tests.
- Real-world validation passes with performance budgets.
- GitHub Action adoption is documented and tested.
- Release and detector contribution docs exist.
- The CLI output and JSON schema are considered stable enough for teams to automate against.
