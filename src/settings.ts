export const DEFAULT_HOOK_COMMAND = "bunx --bun @open-pets/claude-pets@0.1.0 hook";

export function claudeCodeSettings(command = DEFAULT_HOOK_COMMAND) {
  return {
    hooks: {
      UserPromptSubmit: [{ hooks: [{ type: "command", command }] }],
      PreToolUse: [
        {
          matcher: "Bash|Edit|Write|MultiEdit",
          hooks: [{ type: "command", command }],
        },
      ],
      PermissionRequest: [{ hooks: [{ type: "command", command }] }],
      Notification: [{ hooks: [{ type: "command", command }] }],
      Stop: [{ hooks: [{ type: "command", command }] }],
      StopFailure: [{ hooks: [{ type: "command", command }] }],
    },
  };
}

export function mergeClaudeSettings(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
  const cleanedExisting = removeClaudePetsHooks(existing);
  return {
    ...cleanedExisting,
    hooks: mergeHookConfig(isRecord(cleanedExisting.hooks) ? cleanedExisting.hooks : {}, isRecord(incoming.hooks) ? incoming.hooks : {}),
  };
}

export function removeClaudePetsHooks(settings: Record<string, unknown>) {
  if (!isRecord(settings.hooks)) return settings;
  const nextHooks: Record<string, unknown> = {};
  for (const [hookName, hookEntries] of Object.entries(settings.hooks)) {
    if (!Array.isArray(hookEntries)) {
      nextHooks[hookName] = hookEntries;
      continue;
    }
    const filtered = hookEntries
      .map(removeClaudePetsHooksFromEntry)
      .filter((entry): entry is Record<string, unknown> => entry !== null);
    if (filtered.length > 0) nextHooks[hookName] = filtered;
  }
  return { ...settings, hooks: nextHooks };
}

export function hasClaudePetsHooks(settings: Record<string, unknown>) {
  return JSON.stringify(settings) !== JSON.stringify(removeClaudePetsHooks(settings));
}

function mergeHookConfig(existing: Record<string, unknown>, incoming: Record<string, unknown>) {
  const result: Record<string, unknown> = { ...existing };
  for (const [hookName, hookEntries] of Object.entries(incoming)) {
    const current = Array.isArray(result[hookName]) ? result[hookName] : [];
    result[hookName] = uniqueJsonEntries([...current, ...(Array.isArray(hookEntries) ? hookEntries : [])]);
  }
  return result;
}

function uniqueJsonEntries(entries: unknown[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = JSON.stringify(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeClaudePetsHooksFromEntry(entry: unknown): Record<string, unknown> | null {
  if (!isRecord(entry)) return entry as Record<string, unknown>;
  if (!Array.isArray(entry.hooks)) return entry;
  const hooks = entry.hooks;
  const filteredHooks = hooks.filter((hook) => !isManagedClaudePetsHook(hook));
  if (filteredHooks.length === 0) return null;
  return { ...entry, hooks: filteredHooks };
}

function isManagedClaudePetsHook(hook: unknown) {
  if (!isRecord(hook)) return false;
  if (hook.type !== "command" || typeof hook.command !== "string") return false;
  return isManagedClaudePetsCommand(hook.command);
}

export function isManagedClaudePetsCommand(command: string) {
  const normalized = command.trim().replace(/\s+/g, " ");
  return normalized === "claude-pets hook"
    || /^bunx(?: --bun)? claude-pets(?:@[\w.-]+)? hook$/.test(normalized)
    || /^bunx(?: --bun)? @open-pets\/claude-pets(?:@[\w.-]+)? hook$/.test(normalized)
    || /^bun ['"]?.*claude-pets.*(?:cli\.ts|cli\.js)['"]? hook$/.test(normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
