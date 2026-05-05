# Claude Pets Production Release Readiness Plan

Status: draft for @oracle review  
Scope: publishable `claude-pets` package for installing Claude Code hooks that send ambient OpenPets status updates.

## Goal

Make `claude-pets` installable by users with:

```bash
bunx claude-pets install
```

The package should safely install project-local Claude Code hooks and invoke OpenPets through the published `@openpets/client` package.

## Launch contract

`claude-pets` is an optional companion to OpenPets:

- OpenPets desktop app is installed separately.
- `@openpets/mcp` handles authored safe speech and explicit tools.
- `claude-pets` handles automatic Claude Code hook → pet state transitions.

## Current blockers

### 1. Package is not publish-ready

Current issues:

- `package.json` version is `0.0.0`.
- `bin.claude-pets` points to `./src/cli.ts`.
- dependencies are local `file:../openpets/...` paths.
- no `files` allowlist.
- no build/prepublish scripts.
- `tsconfig.json` has no `outDir`/declarations.

Required:

- set version to `0.1.0`
- depend only on published `@openpets/client: 0.1.0`; do not depend directly on `@openpets/core`
- compile to `dist`
- point `bin` to `dist/cli.js`
- include only `dist`, `README.md`, `LICENSE`, and relevant assets/docs
- add `prepack` and `prepublishOnly`

### 2. Runtime decision: Bun-only vs Node-compatible

Current package uses Bun APIs:

- `#!/usr/bin/env bun`
- `Bun.argv`
- `Bun.stdin.stream()` in hook handling
- `bunx claude-pets hook` as installed hook command

Recommendation for v0.1:

- Keep Bun as the required runtime.
- Add `engines: { "bun": ">=1.3.0" }` unless older Bun versions are tested.
- Document Bun requirement clearly.
- Defer Node compatibility unless user demand appears.

### 3. Install behavior needs production polish

Current behavior:

- installs to `.claude/settings.local.json` under `process.cwd()`
- merges hooks and backs up existing settings
- no uninstall command
- no dry-run flag on install, only `print`

Required before release:

- keep project-local install as default and document that command must be run from the target project root
- add `uninstall` command to remove `claude-pets` hook entries
- add `--dry-run` to `install`
- ensure reinstall is idempotent and strips older managed `claude-pets` commands before adding the current command
- preserve non-claude-pets hooks exactly
- create backups only before actual writes, not for dry-run or no-op installs

### 4. Hook command/versioning

Current published hook command:

```txt
bunx --bun claude-pets@0.1.0 hook
```

Required:

- use the pinned Bun command for the npm install path
- local development path stays behind `--local-command`
- install/uninstall should recognize old and new managed commands:
  - `claude-pets hook`
  - `bunx claude-pets hook`
  - `bunx --bun claude-pets hook`
  - `bunx claude-pets@... hook`
  - `bunx --bun claude-pets@... hook`
  - local `bun /path/to/claude-pets/... hook`

### 5. Docs need to switch from source-first to package-first

Required README changes:

- lead with OpenPets desktop prerequisite
- lead with `bunx claude-pets install`
- explain project-local settings file
- document `uninstall`, `print`, `test-event`, `--local-command`
- troubleshooting:
  - OpenPets not running
  - hooks not firing
  - wrong project directory
  - settings backup/restore

Add:

- `CHANGELOG.md`
- release checklist or smoke-test doc

## Security and privacy requirements

Keep:

- no prompt/transcript/diff/file contents sent
- only hook metadata → coarse OpenPets states
- failures are quiet when OpenPets is not running

Before release:

- document privacy behavior in README
- ensure `hook` command does not log raw hook payloads
- ensure installer backs up before modifying settings
- avoid shell interpolation with untrusted payload content

## Testing requirements

Existing tests cover event mapping.

Add tests for:

- install merge idempotency
- uninstall removes claude-pets hooks only
- local command vs published command snippets
- invalid/non-object `hooks` safety failure
- command replacement from older hook command variants
- hook command maps representative Claude hook payloads without leaking payload content

## Proposed implementation order

1. Update package metadata for `0.1.0` and dist publishing.
2. Add `dist` build config and build script.
3. Replace local OpenPets dependencies with only `@openpets/client: 0.1.0`.
4. Add uninstall/dry-run/idempotent replace behavior.
5. Add tests for settings install/uninstall behavior.
6. Update README to package-first install flow.
7. Add `CHANGELOG.md` and smoke test checklist.
8. Run `bun test`, `bun run typecheck`, `bun run build`, `bun pm pack --dry-run`.
9. Ask @oracle for final review before commit/publish.

## Release blockers external to this repo

- `@openpets/core@0.1.0` and `@openpets/client@0.1.0` must be published or the package install path must be tested with tarballs.
- OpenPets desktop app should be installed/running for end-to-end smoke tests.
