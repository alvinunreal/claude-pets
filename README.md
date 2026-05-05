<p align="center">
  <img src="assets/claude-pets.png" alt="Claude Pets — pixel art Claude Code integration for OpenPets" width="100%" />
</p>

<h1 align="center">Claude Pets</h1>

<p align="center">
  <strong>Make Claude Code feel alive with OpenPets.</strong>
</p>

<p align="center">
  Optional Claude Code hooks for automatic OpenPets status changes while Claude works.
</p>

---

## What is this?

Claude Pets connects Claude Code hooks to [OpenPets](https://github.com/alvinunreal/openpets), a local desktop pet that reacts to coding work.

OpenPets is the required desktop app/runtime. Install it from [github.com/alvinunreal/openpets](https://github.com/alvinunreal/openpets) before enabling Claude Pets hooks.

It maps coarse Claude Code activity to pet states:

- prompt submitted → thinking
- file edits → editing
- shell commands → running/testing
- permission prompts → waving/waiting
- stop/failure → success/error

For authored pet speech, use the OpenPets MCP server directly. Claude Pets is for lightweight automatic background status transitions.

## Requirements

- Bun `>= 1.3.0`
- Claude Code
- OpenPets desktop app installed or running

## Install

From the project where you use Claude Code:

```bash
bunx claude-pets install
```

This writes/merges project-local Claude settings:

```txt
.claude/settings.local.json
```

It backs up existing settings before changing them and preserves unrelated hooks.

Preview the settings without writing:

```bash
bunx claude-pets install --dry-run
```

Print only the Claude settings snippet:

```bash
bunx claude-pets print
```

## Uninstall

From the same project root:

```bash
bunx claude-pets uninstall
```

Preview uninstall without writing:

```bash
bunx claude-pets uninstall --dry-run
```

Uninstall removes only managed Claude Pets hook commands and preserves unrelated Claude Code settings.

## Test it

With OpenPets running:

```bash
bunx claude-pets test-event thinking
bunx claude-pets test-event testing
bunx claude-pets test-event success
```

## Local development

When working from this source checkout, use an absolute local hook command:

```bash
cd ~/repos/pets/claude-pets
bun install
bun test
bun run typecheck
bun run build

# From a Claude Code project root:
bun ~/repos/pets/claude-pets/src/cli.ts install --local-command
```

The generated local hook command points to your checkout. Production installs use:

```txt
bunx --bun claude-pets@0.1.0 hook
```

## Commands

```txt
claude-pets install [--dry-run] [--local-command]
claude-pets uninstall [--dry-run]
claude-pets print [--local-command]
claude-pets hook
claude-pets test-event <state>
```

## Privacy

Claude Pets never sends prompts, transcripts, diffs, shell output, or file contents. It maps Claude hook metadata to simple OpenPets events and exits quietly if OpenPets is not running.

## Troubleshooting

### OpenPets is not reacting

- Start the OpenPets desktop app.
- Run `bunx claude-pets test-event thinking`.
- Confirm the OpenPets MCP/client packages are installed and current.

### Hooks are not firing

- Make sure you ran `bunx claude-pets install` from the Claude Code project root.
- Check `.claude/settings.local.json` exists in that project.
- Restart Claude Code after installing hooks.

### Bun is missing

Install Bun first: <https://bun.com>

### Restore settings from backup

Each write creates a backup next to the settings file:

```txt
.claude/settings.local.json.bak-<timestamp>
```

Quit Claude Code, copy the backup over `.claude/settings.local.json`, then restart Claude Code.

## Recommended setup

For the best experience, use both:

1. **OpenPets MCP** for Claude-authored safe speech.
2. **Claude Pets hooks** for automatic background state transitions.

That gives you intentional messages plus ambient visual feedback.
