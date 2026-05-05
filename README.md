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
- completed/failure → success/error, then idle

For authored pet speech, use the OpenPets MCP server directly. Claude Pets is for lightweight automatic background status transitions.

## Requirements

- Bun `>= 1.3.0`
- Claude Code
- OpenPets desktop app installed or running

## Install

Most users only need three steps: install OpenPets desktop, add the MCP server, then install global hooks.

### 1. Install OpenPets desktop

Download the latest OpenPets app from:

https://github.com/alvinunreal/openpets/releases/latest

Choose the file for your OS:

- **macOS Apple Silicon**: `OpenPets-*-arm64.dmg` or `OpenPets-*-arm64.zip`
- **Windows**: `OpenPets-Setup-*-x64.exe`
- **Linux**: `OpenPets-*-x86_64.AppImage` or `OpenPets-*-amd64.deb`

Then launch OpenPets once. You should see the desktop pet and/or the OpenPets tray/menu-bar icon.

> Preview builds are currently unsigned. macOS or Windows may show a security warning the first time you open the app.

### 2. Add OpenPets to Claude Code

This lets Claude talk to and control your pet:

```bash
claude mcp add -s user openpets -- bunx @open-pets/mcp
```

Restart Claude Code, then confirm it is listed:

```bash
claude mcp list
```

### 3. Install Claude Pets hooks globally

This enables automatic pet reactions in every Claude Code project on your machine:

```bash
bunx @open-pets/claude-pets install
```

This writes/merges your user-wide Claude Code settings:

```txt
~/.claude/settings.json
```

It backs up existing settings before changing them and preserves unrelated hooks.

Restart Claude Code after installing hooks.

If you only want hooks in the current project, use:

```bash
bunx @open-pets/claude-pets install --project
```

That writes project-local settings instead:

```txt
.claude/settings.local.json
```

Preview the settings without writing:

```bash
bunx @open-pets/claude-pets install --dry-run
```

Print only the Claude settings snippet:

```bash
bunx @open-pets/claude-pets print
```

## Manual hook setup

If you do not want the installer to edit files, print the settings snippet:

```bash
bunx @open-pets/claude-pets print
```

Then merge the printed `hooks` object into your user-wide Claude Code settings:

```txt
~/.claude/settings.json
```

The production hook command should be:

```txt
bunx --bun @open-pets/claude-pets@0.1.0 hook
```

Restart Claude Code after changing hook settings.

## Uninstall

Remove the global hooks:

```bash
bunx @open-pets/claude-pets uninstall
```

This removes the global hooks from `~/.claude/settings.json`.

If you installed project-local hooks, uninstall them with:

```bash
bunx @open-pets/claude-pets uninstall --project
```

Preview uninstall without writing:

```bash
bunx @open-pets/claude-pets uninstall --dry-run
```

Uninstall removes only managed Claude Pets hook commands and preserves unrelated Claude Code settings.

## Test it

With OpenPets running:

```bash
bunx @open-pets/claude-pets test-event thinking
bunx @open-pets/claude-pets test-event testing
bunx @open-pets/claude-pets test-event success
```

The pet should animate briefly, then return to idle.

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
bunx --bun @open-pets/claude-pets@0.1.0 hook
```

## Commands

```txt
claude-pets install [--dry-run] [--project] [--local-command]
claude-pets uninstall [--dry-run] [--project]
claude-pets print [--local-command]
claude-pets hook
claude-pets test-event <state>
```

## Privacy

Claude Pets never sends prompts, transcripts, diffs, shell output, or file contents. It maps Claude hook metadata to simple OpenPets events and exits quietly if OpenPets is not running.

## Troubleshooting

### OpenPets is not reacting

- Start the OpenPets desktop app.
- Run `bunx @open-pets/claude-pets test-event thinking`.
- Confirm the OpenPets MCP/client packages are installed and current.

### Hooks are not firing

- Make sure you ran `bunx @open-pets/claude-pets install`.
- Check `~/.claude/settings.json` contains `@open-pets/claude-pets`.
- In Claude Code, run `/hooks` and confirm the Claude Pets command appears under user settings.
- Restart Claude Code after installing hooks.

If you installed with `--project`, check `.claude/settings.local.json` in that project instead.

### Bun is missing

Install Bun first: <https://bun.com>

### Restore settings from backup

Each write creates a backup next to the settings file:

```txt
~/.claude/settings.json.bak-<timestamp>
```

Quit Claude Code, copy the backup over `~/.claude/settings.json`, then restart Claude Code.

For project installs, backups are created next to `.claude/settings.local.json`.

## Recommended setup

For the best experience, use both:

1. **OpenPets MCP** for Claude-authored safe speech.
2. **Claude Pets hooks** for automatic background state transitions.

That gives you intentional messages plus ambient visual feedback.
