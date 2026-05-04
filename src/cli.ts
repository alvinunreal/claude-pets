#!/usr/bin/env bun
import { safeSendEvent, isOpenPetsState } from "@openpets/client";
import { fileURLToPath } from "node:url";
import { installClaudePets, settingsSnippet } from "./install.js";
import { runHook } from "./hook.js";

const PUBLISHED_HOOK_COMMAND = "bunx claude-pets hook";
const LOCAL_HOOK_COMMAND = `bun ${JSON.stringify(fileURLToPath(import.meta.url))} hook`;

async function main(argv: string[]) {
  const [command, ...rest] = argv;
  switch (command) {
    case "install": {
      const useLocalCommand = rest.includes("--local-command");
      const targetPath = await installClaudePets({ command: useLocalCommand ? LOCAL_HOOK_COMMAND : PUBLISHED_HOOK_COMMAND });
      console.log(`Installed Claude Code OpenPets hooks to ${targetPath}`);
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
  return 0;
}

function printHelp() {
  console.log(`claude-pets

Usage:
  claude-pets install [--local-command]
  claude-pets print [--local-command]
  claude-pets hook
  claude-pets test-event <state>
`);
}

const exitCode = await main(Bun.argv.slice(2));
process.exit(exitCode);
