import { createManualEvent, type OpenPetsEvent, type OpenPetsState } from "@open-pets/client";

const editTools = new Set(["Edit", "Write", "MultiEdit"]);
const testCommandPattern = /\b(test|vitest|jest|pytest|bun test|npm test)\b/i;

export function mapClaudeEventToOpenPets(payload: unknown): OpenPetsEvent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const hookName = typeof record.hook_event_name === "string" ? record.hook_event_name : "";
  const toolName = typeof record.tool_name === "string" ? record.tool_name : "";
  const toolInput = record.tool_input && typeof record.tool_input === "object" && !Array.isArray(record.tool_input)
    ? (record.tool_input as Record<string, unknown>)
    : {};
  const command = typeof toolInput.command === "string" ? toolInput.command : "";

  const state = mapHookState(hookName, toolName, command);
  if (!state) return null;

  return createManualEvent(state, {
    source: "claude-code",
    type: `claude.${hookName || state}`,
    ...(toolName ? { tool: toolName } : {}),
  });
}

function mapHookState(hookName: string, toolName: string, command: string): OpenPetsState | null {
  if (hookName === "UserPromptSubmit") return "thinking";
  if (hookName === "PreToolUse" && editTools.has(toolName)) return "editing";
  if (hookName === "PreToolUse" && toolName === "Bash") return testCommandPattern.test(command) ? "testing" : "running";
  if (hookName === "PermissionRequest") return "waving";
  if (hookName === "Notification") return "waiting";
  if (hookName === "Stop") return "success";
  if (hookName === "StopFailure") return "error";
  return null;
}
