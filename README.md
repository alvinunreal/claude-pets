# claude-pets

Claude Code integration for OpenPets.

## Local development

Build OpenPets packages first:

```bash
cd /home/alvin/openpets
bun run build:packages
```

Then install and test this package:

```bash
cd /home/alvin/claude-pets
bun install
bun run typecheck
bun test
```

## Usage

```bash
bunx claude-pets install
```

For local source development, use absolute hook commands:

```bash
bun /home/alvin/claude-pets/src/cli.ts install --local-command
```
