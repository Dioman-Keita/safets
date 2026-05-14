# SafeTS Roadmap

This roadmap is the execution plan for turning SafeTS from an early CLI into a publishable and adoptable tool.

## Principles

- Keep the product narrow and reliable before expanding scope.
- Prefer fewer high-signal detections over noisy coverage.
- Optimize for zero-friction install, clear output, and CI adoption.
- Ship each phase only when its exit criteria are met.

## Milestones

### Phase 1: NPM Ready

Goal: make SafeTS cleanly publishable and reliable to install and run.

Exit criteria:

- `npm pack --dry-run` contains only intentional publishable files
- `safets doctor` works from an installed package without `ts-node`
- CLI has stable `--help`, `--version`, and exit codes
- core detectors are covered by tests

Scope:

- Ship compiled JS output in `dist/`
- Point the package `bin` to a compiled JS entrypoint
- Remove `ts-node` as a runtime requirement for end users
- Add publish controls with `files` or `.npmignore`
- Add CLI help/version support
- Add detector and CLI integration tests

Tracked issues:

- P0: Publish a compiled JS CLI build
- P0: Exclude non-product files from npm tarballs
- P0: Add `--help`, `--version`, and stable exit code coverage
- P0: Add detector fixtures and CLI integration tests

### Phase 2: Developer Adoption

Goal: make SafeTS easy to adopt in real repositories and trustworthy in CI.

Exit criteria:

- baseline, debt, and fail-on-new flows are stable across real repos
- output can be consumed by both humans and automation
- the tool has been validated on multiple public TypeScript projects

Scope:

- Add JSON output mode
- Harden baseline and monorepo behavior
- Improve crash explanations and fix suggestions
- Measure false positives on real repositories
- Document CI and rollout guidance

Tracked issues:

- P1: Add machine-readable JSON output
- P1: Validate SafeTS on real open source TypeScript repositories
- P1: Harden monorepo and workspace support

### Phase 3: Community Adoption

Goal: turn SafeTS into a tool teams can standardize on.

Exit criteria:

- first-class CI integration exists
- release process is documented and repeatable
- contributors can understand how to add or improve detectors

Scope:

- Add a GitHub Action
- Document release and versioning workflow
- Document detector authoring and contribution flow
- Prepare editor or lint ecosystem integrations

Tracked issues:

- P2: Publish a GitHub Action for CI adoption
- P2: Document release, versioning, and publishing workflow
- P2: Document detector authoring and contribution guidelines

## Priority Model

- `P0`: blocks npm publication or basic product trust
- `P1`: important for real adoption by developers and teams
- `P2`: ecosystem and scale-up work after the core is stable

## Working Rules

- Do not start Phase 2 before all Phase 1 exit criteria are met.
- Do not start Phase 3 before SafeTS is stable in real repositories.
- Every roadmap issue should map to one measurable user outcome.

## Current Status

- Active milestone: Phase 1: NPM Ready
- Immediate focus: ship a compiled CLI, clean tarball contents, and test coverage
