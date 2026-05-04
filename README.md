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

Claude Pets connects Claude Code to [OpenPets](https://github.com/alvinunreal/openpets), a local desktop pet that reacts to coding work.

Use it when you want Claude Code activity to automatically update your pet state:

- prompt submitted → thinking
- file edits → editing
- shell commands → running/testing
- permission prompts → waiting/waving
- stop/failure → success/error

For authored pet speech, prefer the OpenPets MCP server directly. This package is for lightweight automatic status transitions through Claude Code hooks.

## Current status

Claude Pets is currently source-first. It expects OpenPets to be checked out next to this repo because `@openpets/client` and `@openpets/core` are local file dependencies for now.

```txt
~/repos/pets/
  openpets/
  claude-pets/
```

Once OpenPets packages are published, the simple `bunx claude-pets install` flow will be the default path.

## Requirements

- Bun
- Claude Code
- OpenPets built locally

```bash
mkdir -p ~/repos/pets
cd ~/repos/pets
git clone https://github.com/alvinunreal/openpets.git
git clone https://github.com/alvinunreal/claude-pets.git

cd openpets
bun install
bun run build

cd ../claude-pets
bun install
bun test
bun run typecheck
```

Start OpenPets:

```bash
bun "$HOME/repos/pets/openpets/packages/cli/src/index.ts" start
```

## Install Claude hooks from source

From a project where you use Claude Code:

```bash
bun "$HOME/repos/pets/claude-pets/src/cli.ts" install --local-command
```

This writes/merges:

```txt
.claude/settings.local.json
```

It backs up existing settings before writing.

To preview the settings instead:

```bash
bun "$HOME/repos/pets/claude-pets/src/cli.ts" print --local-command
```

## Future package install

After the package is published, the intended install command is:

```bash
bunx claude-pets install
```

That writes hooks using a durable `bunx claude-pets hook` command.

## Local development

When working from this source checkout, install hooks using an absolute local command:

```bash
cd ~/repos/pets/claude-pets
bun install
bun run typecheck
bun test
```

Use `--local-command` when installing hooks from this checkout. The generated hook command uses the absolute path to your local `src/cli.ts`.

## Test it

With OpenPets running:

```bash
bun "$HOME/repos/pets/claude-pets/src/cli.ts" test-event thinking
bun "$HOME/repos/pets/claude-pets/src/cli.ts" test-event testing
bun "$HOME/repos/pets/claude-pets/src/cli.ts" test-event success
```

## How it works

```txt
Claude Code hook payload
        ↓
claude-pets hook mapper
        ↓
@openpets/client
        ↓ same-user OS IPC
OpenPets desktop pet
```

Claude Pets never sends prompts, transcripts, diffs, shell output, or file contents. It maps hook metadata to simple OpenPets events and exits quietly if OpenPets is not running.

## Uninstall

Remove the `claude-pets` hook entries from:

```txt
.claude/settings.local.json
```

Installs create timestamped backups next to that file before merging changes.

## Commands

```txt
claude-pets install [--local-command]
claude-pets print [--local-command]
claude-pets hook
claude-pets test-event <state>
```

## Recommended setup

For the best experience, use both:

1. **OpenPets MCP** for Claude-authored safe speech.
2. **Claude Pets hooks** for automatic background state transitions.

That gives you intentional messages plus ambient visual feedback.
