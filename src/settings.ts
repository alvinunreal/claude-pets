export function claudeCodeSettings(command = "claude-pets hook") {
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
  return {
    ...existing,
    hooks: mergeHookConfig(isRecord(existing.hooks) ? existing.hooks : {}, isRecord(incoming.hooks) ? incoming.hooks : {}),
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
