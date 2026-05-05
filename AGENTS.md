# AGENTS.md

Agent guidance for working with the Claude Pets codebase.

## Repository Map

### Project Structure

```
claude-pets/
├── src/                          # Source code
│   ├── cli.ts                    # CLI entry point and command dispatcher
│   ├── install.ts                # Settings installation and file I/O
│   ├── settings.ts               # Hook configuration and settings manipulation
│   ├── hook.ts                   # Runtime hook execution
│   ├── map-claude-event.ts       # Claude Code → OpenPets event mapping
│   └── *.test.ts                 # Test files (excluded from codemap)
├── codemap.md                    # Root architecture documentation
├── src/codemap.md                # Source architecture documentation
├── README.md                     # User-facing documentation
├── CHANGELOG.md                  # Version history
└── package.json                  # Package metadata and dependencies
```

### Key Components

#### CLI (`src/cli.ts`)
- **Commands**: install, uninstall, print, hook, test-event, help
- **Install options**: --dry-run, --project, --local-command
- **Hook commands**: Published uses `bunx --bun @open-pets/claude-pets@0.1.0 hook`, local dev uses `bun src/cli.ts hook`

#### Hook/Install Flow (`src/install.ts`, `src/settings.ts`)
- **Scopes**: User-wide (`~/.claude/settings.json`) or project-local (`.claude/settings.local.json`)
- **Safety**: Automatic backups created as `settings.json.bak-<timestamp>`
- **Idempotent**: Can safely run install/uninstall multiple times
- **Hook Events**: UserPromptSubmit, PreToolUse, PermissionRequest, Notification, Stop, StopFailure

#### OpenPets Client Integration (`src/hook.ts`, `src/map-claude-event.ts`)
- **Dependency**: `@open-pets/client` (v0.1.0)
- **APIs Used**: `safeSendEvent()`, `createManualEvent()`, `isOpenPetsState()`
- **State Mapping**:
  - `UserPromptSubmit` → `thinking`
  - `PreToolUse` + Edit tools → `editing`
  - `PreToolUse` + Bash with tests → `testing`
  - `PreToolUse` + Bash (other) → `running`
  - `PermissionRequest` → `waving`
  - `Notification` → `waiting`
  - `Stop` → `success`
  - `StopFailure` → `error`
- **Auto-Idle**: Terminal states auto-return to idle after 2-2.6 seconds

#### Privacy/Data Flow
- **Local Only**: All processing happens on the local machine
- **No External Calls**: OpenPets client communicates via local socket/IPC to the desktop app
- **No Persistence**: Events are processed in-memory, no logging to disk
- **No Telemetry**: No data sent to external servers
- **Settings Only**: Only the hooks configuration is persisted in Claude Code's settings.json

### Development Commands

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Build
bun run build

# Local install with dev hooks
bun src/cli.ts install --local-command

# Test event
bun src/cli.ts test-event thinking
```

### Architecture Patterns

1. **Pure Functions**: Settings manipulation uses immutable patterns
2. **Defensive I/O**: All file operations have error handling and validation
3. **Command Pattern**: Simple dispatcher for CLI commands
4. **Event Translation**: Centralized mapping table for Claude Code → OpenPets
5. **Safe Defaults**: Backups created before any destructive operation

### Dependencies

- **Runtime**: Bun >= 1.3.0
- **Production**: `@open-pets/client` (0.1.0)
- **Development**: TypeScript 5.9.3, @types/bun

### Excluded from Codemap

- Test files (`*.test.ts`, `*.spec.ts`)
- Documentation (`docs/`, `*.md` except codemap files)
- Build output (`dist/`)
- Node modules (`node_modules/`)
