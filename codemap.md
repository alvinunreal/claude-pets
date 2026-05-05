# claude-pets/

Claude Code hooks for OpenPets desktop pet integration. Bridges Claude Code activity to a local desktop pet for visual feedback.

## Responsibility

- Provides CLI commands to install/uninstall Claude Code hooks
- Maps Claude Code lifecycle events (prompts, tool use, completion) to OpenPets states
- Sends state updates to the local OpenPets desktop application
- Manages Claude Code settings.json configuration safely with backups

## Design

**Hook-Based Architecture**: Uses Claude Code's native hooks system to receive events via stdin. No persistent background process required.

**State Mapping**: Translates Claude Code events (UserPromptSubmit, PreToolUse, Stop, etc.) into OpenPets visual states (thinking, editing, testing, success, error).

**Safe Settings Management**: All settings modifications are non-destructive with automatic backups. Supports both user-wide (~/.claude/settings.json) and project-local (.claude/settings.local.json) scopes.

**Auto-Idle Recovery**: Terminal states (success, error, warning, celebrating) automatically return to idle after a delay (2-2.6s) to prevent stuck states.

**Idempotent Operations**: Install/uninstall can be run multiple times safely without duplicate entries or data loss.

## Flow

```
User runs "claude-pets install"
  → Detects scope (user vs project)
  → Reads existing settings.json
  → Merges Claude Pets hook configuration
  → Creates backup (.bak-<timestamp>)
  → Writes updated settings

Claude Code triggers hook event
  → Executes configured command: "bunx @open-pets/claude-pets@0.1.0 hook"
  → Hook receives JSON payload via stdin
  → mapClaudeEventToOpenPets() translates to OpenPets state
  → safeSendEvent() emits to OpenPets via local socket/IPC
  → Auto-idle timer scheduled for terminal states
```

## Integration

**Claude Code**: Integrates via the `hooks` configuration in settings.json. Supports events: UserPromptSubmit, PreToolUse (Bash/Edit/Write/MultiEdit), PermissionRequest, Notification, Stop, StopFailure.

**OpenPets Client**: Uses `@open-pets/client` npm package for communication. Events sent to local OpenPets desktop app via socket/IPC. No network calls to external services.

**Bun Runtime**: Requires Bun >= 1.3.0. Uses Bun-specific APIs (Bun.stdin.stream(), Bun.sleep()) for efficient I/O and async operations.

**Privacy/Data Flow**: All data stays local. Claude Code events are processed in-memory and sent directly to the local OpenPets app. No telemetry, no external servers, no data persistence beyond the settings.json configuration file.
