import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapClaudeEventToOpenPets } from "./map-claude-event.js";
import { installClaudePets, uninstallClaudePets } from "./install.js";
import { claudeCodeSettings, isManagedClaudePetsCommand, mergeClaudeSettings, removeClaudePetsHooks } from "./settings.js";

const originalCwd = process.cwd();
const tempDirs: string[] = [];

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("mapClaudeEventToOpenPets", () => {
  it("maps prompt submit to thinking", () => {
    expect(mapClaudeEventToOpenPets({ hook_event_name: "UserPromptSubmit" })).toMatchObject({ state: "thinking", source: "claude-code" });
  });

  it("maps edit tools to editing", () => {
    expect(mapClaudeEventToOpenPets({ hook_event_name: "PreToolUse", tool_name: "Edit" })).toMatchObject({ state: "editing", tool: "Edit" });
  });

  it("maps bash test commands to testing", () => {
    expect(mapClaudeEventToOpenPets({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "bun test" } })).toMatchObject({ state: "testing" });
  });

  it("maps bash non-test commands to running", () => {
    expect(mapClaudeEventToOpenPets({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } })).toMatchObject({ state: "running" });
  });

  it("maps permission and completion hooks", () => {
    expect(mapClaudeEventToOpenPets({ hook_event_name: "PermissionRequest" })).toMatchObject({ state: "waving" });
    expect(mapClaudeEventToOpenPets({ hook_event_name: "Notification" })).toMatchObject({ state: "waiting" });
    expect(mapClaudeEventToOpenPets({ hook_event_name: "Stop" })).toMatchObject({ state: "success" });
    expect(mapClaudeEventToOpenPets({ hook_event_name: "StopFailure" })).toMatchObject({ state: "error" });
  });

  it("returns null for unknown input", () => {
    expect(mapClaudeEventToOpenPets(null)).toBeNull();
    expect(mapClaudeEventToOpenPets({ hook_event_name: "Unknown" })).toBeNull();
  });
});

describe("settings", () => {
  it("uses the provided command", () => {
    const settings = claudeCodeSettings("bun ./src/cli.ts hook");
    expect(JSON.stringify(settings)).toContain("bun ./src/cli.ts hook");
  });

  it("merges and dedupes hooks", () => {
    const snippet = claudeCodeSettings("claude-pets hook");
    const merged = mergeClaudeSettings(snippet, snippet) as { hooks: Record<string, unknown[]> };
    expect(merged.hooks.UserPromptSubmit).toHaveLength(1);
  });

  it("recognizes managed claude-pets commands", () => {
    expect(isManagedClaudePetsCommand("claude-pets hook")).toBe(true);
    expect(isManagedClaudePetsCommand("bunx claude-pets hook")).toBe(true);
    expect(isManagedClaudePetsCommand("bunx --bun claude-pets@0.1.0 hook")).toBe(true);
    expect(isManagedClaudePetsCommand("bun '/tmp/claude-pets/src/cli.ts' hook")).toBe(true);
    expect(isManagedClaudePetsCommand("echo claude-pets hook")).toBe(false);
  });

  it("removes only claude-pets hooks", () => {
    const cleaned = removeClaudePetsHooks({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: "command", command: "bunx claude-pets hook" }] },
          { hooks: [{ type: "command", command: "echo keep" }] },
        ],
      },
    }) as { hooks: { UserPromptSubmit: Array<{ hooks: Array<{ command: string }> }> } };
    expect(cleaned.hooks.UserPromptSubmit).toEqual([{ hooks: [{ type: "command", command: "echo keep" }] }]);
  });

  it("preserves malformed hook entries it does not own", () => {
    const settings = { hooks: { Stop: [{ matcher: "Other" }, { hooks: "not-an-array" }] } };
    expect(removeClaudePetsHooks(settings)).toEqual(settings);
  });
});

describe("install/uninstall", () => {
  it("installs into empty project settings", async () => {
    const dir = await tempProject();
    process.chdir(dir);
    const result = await installClaudePets({ command: "bunx --bun claude-pets@0.1.0 hook" });
    expect(result.changed).toBe(true);
    expect(await readSettings(dir)).toContain("bunx --bun claude-pets@0.1.0 hook");
  });

  it("reinstall is idempotent", async () => {
    const dir = await tempProject();
    process.chdir(dir);
    await installClaudePets({ command: "bunx --bun claude-pets@0.1.0 hook" });
    const second = await installClaudePets({ command: "bunx --bun claude-pets@0.1.0 hook" });
    expect(second.changed).toBe(false);
  });

  it("replaces old managed commands while preserving unrelated hooks", async () => {
    const dir = await tempProject();
    await writeSettings(dir, {
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: "command", command: "bunx claude-pets hook" }] },
          { hooks: [{ type: "command", command: "echo keep" }] },
        ],
      },
    });
    process.chdir(dir);
    await installClaudePets({ command: "bunx --bun claude-pets@0.1.0 hook" });
    const settings = await readSettings(dir);
    expect(settings).not.toContain("bunx claude-pets hook");
    expect(settings).toContain("bunx --bun claude-pets@0.1.0 hook");
    expect(settings).toContain("echo keep");
  });

  it("dry-run does not write settings", async () => {
    const dir = await tempProject();
    process.chdir(dir);
    const result = await installClaudePets({ dryRun: true });
    expect(result.changed).toBe(true);
    await expect(readSettings(dir)).rejects.toThrow();
  });

  it("uninstall removes claude-pets hooks only", async () => {
    const dir = await tempProject();
    await writeSettings(dir, {
      hooks: {
        Stop: [
          { hooks: [{ type: "command", command: "bunx --bun claude-pets@0.1.0 hook" }] },
          { hooks: [{ type: "command", command: "echo keep" }] },
        ],
      },
    });
    process.chdir(dir);
    const result = await uninstallClaudePets();
    expect(result.changed).toBe(true);
    const settings = await readSettings(dir);
    expect(settings).not.toContain("claude-pets");
    expect(settings).toContain("echo keep");
  });

  it("rejects non-object hooks", async () => {
    const dir = await tempProject();
    await writeSettings(dir, { hooks: [] });
    process.chdir(dir);
    await expect(installClaudePets()).rejects.toThrow("non-object hooks");
  });

  it("rejects top-level non-object settings", async () => {
    const dir = await tempProject();
    await writeSettings(dir, []);
    process.chdir(dir);
    await expect(installClaudePets()).rejects.toThrow("must contain a JSON object");
  });
});

async function tempProject() {
  const dir = await mkdtemp(join(tmpdir(), "claude-pets-test-"));
  tempDirs.push(dir);
  return dir;
}

async function writeSettings(dir: string, settings: unknown) {
  const path = join(dir, ".claude", "settings.local.json");
  await Bun.$`mkdir -p ${join(dir, ".claude")}`.quiet();
  await writeFile(path, `${JSON.stringify(settings, null, 2)}\n`);
}

function readSettings(dir: string) {
  return readFile(join(dir, ".claude", "settings.local.json"), "utf8");
}
