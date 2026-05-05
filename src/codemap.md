# src/

Source code for the Claude Pets CLI and hook system.

## Responsibility

- **cli.ts**: Entry point handling all CLI commands (install, uninstall, print, hook, test-event)
- **install.ts**: Settings file I/O, backup creation, and safe JSON merging
- **settings.ts**: Hook configuration generation and settings manipulation utilities
- **hook.ts**: Runtime hook execution, event processing, and OpenPets communication
- **map-claude-event.ts**: Event translation layer from Claude Code to OpenPets states

## Design

**Command Pattern**: CLI uses a simple command dispatcher in `main()` function. Each command is self-contained with explicit options parsing.

**Pure Functions for Settings**: All settings manipulation (merge, remove, check) uses pure functions with immutable patterns. Original settings are never mutated directly.

**Defensive Programming**: All file I/O has error handling. JSON parsing failures throw with context. Settings validation ensures hooks field is an object before merging.

**Event Translation Table**: Centralized mapping in map-claude-event.ts with clear rules:
- UserPromptSubmit → thinking
- PreToolUse + Edit/Write/MultiEdit → editing
- PreToolUse + Bash with test command → testing
- PreToolUse + Bash (other) → running
- PermissionRequest → waving
- Notification → waiting
- Stop → success
- StopFailure → error

## Flow

```
cli.ts main()
  ├─ install → install.ts installClaudePets()
  │            ├─ resolveSettingsPath() → user or project path
  │            ├─ readJsonFile() → existing settings
  │            ├─ mergeClaudeSettings() → settings.ts
  │            ├─ backup existing → write new
  │            └─ return result
  ├─ uninstall → install.ts uninstallClaudePets()
  │              └─ Similar flow with removeClaudePetsHooks()
  ├─ hook → hook.ts runHook()
  │         ├─ Read stdin JSON payload
  │         ├─ mapClaudeEventToOpenPets() → map-claude-event.ts
  │         ├─ safeSendEvent() → @open-pets/client
  │         └─ autoReturnToIdle() for terminal states
  └─ test-event → Direct safeSendEvent() call
```

## Integration

**@open-pets/client**: All OpenPets communication goes through this dependency. Uses `safeSendEvent()`, `createManualEvent()`, and `isOpenPetsState()` APIs.

**Node.js fs/os/path**: Used for cross-platform settings file resolution and safe file operations with backups.

**Bun APIs**: Bun.stdin.stream() for efficient stdin reading, Bun.sleep() for auto-idle delays.

**Claude Code Settings Schema**: Generates settings compatible with Claude Code's hooks configuration format with matchers and command types.
