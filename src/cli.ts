#!/usr/bin/env bun
import { safeSendEvent, isOpenPetsState } from "@open-pets/client";
import { fileURLToPath } from "node:url";
import { installClaudePets, settingsSnippet, uninstallClaudePets } from "./install.js";
import { runHook } from "./hook.js";

const PUBLISHED_HOOK_COMMAND = "bunx --bun @open-pets/claude-pets@0.1.0 hook";
const LOCAL_HOOK_COMMAND = `bun ${shellQuote(fileURLToPath(import.meta.url))} hook`;

async function main(argv: string[]) {
  const [command, ...rest] = argv;
  switch (command) {
    case "install": {
      const useLocalCommand = rest.includes("--local-command");
      const dryRun = rest.includes("--dry-run");
      const scope = rest.includes("--project") ? "project" : "user";
      const result = await installClaudePets({ command: useLocalCommand ? LOCAL_HOOK_COMMAND : PUBLISHED_HOOK_COMMAND, dryRun, scope });
      if (dryRun) {
        console.log(`Would install Claude Code OpenPets hooks to ${result.targetPath}`);
        console.log(JSON.stringify(result.settings, null, 2));
      } else {
        console.log(`${result.changed ? "Installed" : "Already installed"} Claude Code OpenPets hooks to ${result.targetPath}`);
      }
      return 0;
    }
    case "uninstall": {
      const dryRun = rest.includes("--dry-run");
      const scope = rest.includes("--project") ? "project" : "user";
      const result = await uninstallClaudePets({ dryRun, scope });
      if (dryRun) {
        console.log(`Would uninstall Claude Code OpenPets hooks from ${result.targetPath}`);
        console.log(JSON.stringify(result.settings, null, 2));
      } else {
        console.log(`${result.changed ? "Uninstalled" : "No Claude Pets hooks found in"} ${result.targetPath}`);
      }
      return 0;
    }
    case "print": {
      const useLocalCommand = rest.includes("--local-command");
      console.log(settingsSnippet(useLocalCommand ? LOCAL_HOOK_COMMAND : PUBLISHED_HOOK_COMMAND));
      return 0;
    }
    case "hook":
      return runHook();
    case "test-event":
      return testEvent(rest);
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return 0;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      return 1;
  }
}

async function testEvent(args: string[]) {
  const [state] = args;
  if (!isOpenPetsState(state)) {
    console.error(`Invalid OpenPets state: ${state ?? "<missing>"}`);
    return 1;
  }
  const result = await safeSendEvent({ state, source: "claude-pets", type: `claude-pets.test.${state}` });
  if (!result.ok) {
    console.error(result.error.message);
    return 1;
  }
  if (state !== "idle") {
    await Bun.sleep(2000);
    await safeSendEvent({ state: "idle", source: "claude-pets", type: "claude-pets.test.idle" });
  }
  return 0;
}

function printHelp() {
  console.log(`claude-pets

Usage:
  claude-pets install [--dry-run] [--project] [--local-command]
  claude-pets uninstall [--dry-run] [--project]
  claude-pets print [--local-command]
  claude-pets hook
  claude-pets test-event <state>

By default, install/uninstall updates your user-wide Claude Code settings:
  ~/.claude/settings.json

Use --project only when you want hooks in the current project's:
  .claude/settings.local.json
`);
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

const exitCode = await main(Bun.argv.slice(2));
process.exit(exitCode);
