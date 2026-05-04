import { describe, expect, it } from "bun:test";
import { mapClaudeEventToOpenPets } from "./map-claude-event.js";
import { claudeCodeSettings, mergeClaudeSettings } from "./settings.js";

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
});
