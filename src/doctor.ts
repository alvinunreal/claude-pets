import { getHealth } from "@open-pets/client";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolveSettingsPath, type InstallScope } from "./install.js";
import { claudeCodeSettings, isManagedClaudePetsCommand } from "./settings.js";
import { getPackageVersion, getPublishedHookCommand } from "./version.js";

type DoctorStatus = "ok" | "warn" | "fail";

type DoctorCheck = {
  label: string;
  status: DoctorStatus;
  detail: string;
};

type HookSummary = {
  found: number;
  stale: string[];
  versionless: string[];
  commands: string[];
  malformedHooks: boolean;
  missingExpected: string[];
};

export async function runDoctor(options: { scope?: InstallScope } = {}) {
  const checks = await collectDoctorChecks(options.scope ?? "user");
  printDoctorReport(checks);
  return checks.some((check) => check.status === "fail") ? 1 : 0;
}

export async function collectDoctorChecks(scope: InstallScope = "user"): Promise<DoctorCheck[]> {
  const packageVersion = getPackageVersion();
  const settingsPath = resolveSettingsPath(scope);
  const checks: DoctorCheck[] = [];

  checks.push(commandVersionCheck("Bun", "bun", ["--version"], true));
  checks.push(commandVersionCheck("Claude Code", "claude", ["--version"], false));
  checks.push({
    label: "Claude profile",
    status: "ok",
    detail: scope === "project"
      ? `project settings at ${settingsPath}`
      : `${process.env.CLAUDE_CONFIG_DIR ? `CLAUDE_CONFIG_DIR=${process.env.CLAUDE_CONFIG_DIR}` : "default profile"}; settings at ${settingsPath}`,
  });

  const settings = await readSettings(settingsPath);
  if (!settings.ok) {
    checks.push({ label: "Claude settings", status: settings.missing ? "warn" : "fail", detail: settings.detail });
  } else {
    checks.push({ label: "Claude settings", status: "ok", detail: `read ${settingsPath}` });
    const summary = summarizeHooks(settings.value, packageVersion);
    checks.push(hookInstallCheck(scope, summary));
    if (summary.stale.length > 0) {
      checks.push({
        label: "Hook version",
        status: "warn",
        detail: `stale managed hook command(s): ${summary.stale.join(", ")}; run claude-pets install${scope === "project" ? " --project" : ""}`,
      });
    } else if (summary.versionless.length > 0) {
      checks.push({
        label: "Hook version",
        status: "warn",
        detail: `version check skipped for local/unpinned hook command(s): ${summary.versionless.join(", ")}`,
      });
    } else if (summary.found > 0) {
      checks.push({ label: "Hook version", status: "ok", detail: `pinned managed hooks match package version ${packageVersion}` });
    }
    if (summary.malformedHooks) {
      checks.push({ label: "Hook shape", status: "fail", detail: "settings.hooks is present but is not a JSON object" });
    }
  }

  const openPetsHealth = await getHealth({ timeoutMs: 500 }).catch((error: unknown) => error instanceof Error ? error : new Error(String(error)));
  checks.push(!(openPetsHealth instanceof Error)
    ? { label: "OpenPets desktop", status: "ok", detail: `reachable locally${openPetsHealth.activePet ? `; active pet: ${openPetsHealth.activePet}` : ""}` }
    : { label: "OpenPets desktop", status: "warn", detail: `${openPetsHealth.message}; start OpenPets and retry claude-pets test-event thinking` });

  checks.push({
    label: "Next steps",
    status: "ok",
    detail: "after install, restart Claude Code and run /hooks; for MCP, also check claude mcp list",
  });

  return checks;
}

function commandVersionCheck(label: string, command: string, args: string[], required: boolean): DoctorCheck {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 2000,
  });
  if (result.signal === "SIGTERM" || result.error?.message.includes("ETIMEDOUT")) {
    return {
      label,
      status: required ? "fail" : "warn",
      detail: `${command} timed out while checking version`,
    };
  }
  if (result.error) {
    return {
      label,
      status: required ? "fail" : "warn",
      detail: `${command} not found on PATH`,
    };
  }
  if (result.status !== 0) {
    return {
      label,
      status: required ? "fail" : "warn",
      detail: `${command} exited with ${result.status}${result.stderr ? `: ${firstLine(result.stderr)}` : ""}`,
    };
  }
  return { label, status: "ok", detail: firstLine(result.stdout) || `${command} is available` };
}

async function readSettings(path: string): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; missing: boolean; detail: string }> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!isRecord(parsed)) return { ok: false, missing: false, detail: `${path} must contain a JSON object` };
    return { ok: true, value: parsed };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ok: false, missing: true, detail: `${path} does not exist yet; run claude-pets install${path.endsWith("settings.local.json") ? " --project" : ""}` };
    }
    return { ok: false, missing: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function summarizeHooks(settings: Record<string, unknown>, expectedVersion: string): HookSummary {
  if (settings.hooks !== undefined && !isRecord(settings.hooks)) {
    return { found: 0, stale: [], versionless: [], commands: [], malformedHooks: true, missingExpected: [] };
  }

  const hooks = isRecord(settings.hooks) ? settings.hooks : {};
  const commands: string[] = [];
  for (const entries of Object.values(hooks)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!isRecord(entry) || !Array.isArray(entry.hooks)) continue;
      for (const hook of entry.hooks) {
        if (isRecord(hook) && hook.type === "command" && typeof hook.command === "string" && isManagedClaudePetsCommand(hook.command)) {
          commands.push(hook.command);
        }
      }
    }
  }

  const stale = [...new Set(commands.filter((command) => {
    const version = extractPackageVersion(command);
    return version !== null && version !== expectedVersion;
  }))];
  const versionless = [...new Set(commands.filter((command) => extractPackageVersion(command) === null))];
  const missingExpected = expectedHookEntries(getPublishedHookCommand(expectedVersion))
    .filter((expected) => !hasMatchingManagedHook(hooks, expected))
    .map(formatExpectedHook);

  return { found: commands.length, stale, versionless, commands: [...new Set(commands)], malformedHooks: false, missingExpected };
}

function hookInstallCheck(scope: InstallScope, summary: HookSummary): DoctorCheck {
  if (summary.malformedHooks) return { label: "Claude Pets hooks", status: "fail", detail: "cannot inspect malformed hooks" };
  if (summary.found === 0) {
    return {
      label: "Claude Pets hooks",
      status: "warn",
      detail: `no managed hooks found; run claude-pets install${scope === "project" ? " --project" : ""}`,
    };
  }
  if (summary.missingExpected.length > 0) {
    return {
      label: "Claude Pets hooks",
      status: "warn",
      detail: `partial install: missing ${summary.missingExpected.join(", ")}; run claude-pets install${scope === "project" ? " --project" : ""}`,
    };
  }
  return { label: "Claude Pets hooks", status: "ok", detail: `all expected hooks found (${summary.found} managed command(s))` };
}

function extractPackageVersion(command: string) {
  return command.match(/@open-pets\/claude-pets@([^\s]+)\s+hook/)?.[1] ?? command.match(/\bclaude-pets@([^\s]+)\s+hook/)?.[1] ?? null;
}

type ExpectedHookEntry = {
  hookName: string;
  matcher?: string;
};

function expectedHookEntries(command: string): ExpectedHookEntry[] {
  const settings = claudeCodeSettings(command);
  const result: ExpectedHookEntry[] = [];
  for (const [hookName, entries] of Object.entries(settings.hooks)) {
    for (const entry of entries) {
      const record = entry as Record<string, unknown>;
      result.push({ hookName, ...(typeof record.matcher === "string" ? { matcher: record.matcher } : {}) });
    }
  }
  return result;
}

function hasMatchingManagedHook(hooks: Record<string, unknown>, expected: ExpectedHookEntry) {
  const entries = hooks[expected.hookName];
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) => {
    if (!isRecord(entry)) return false;
    if (expected.matcher !== undefined && entry.matcher !== expected.matcher) return false;
    if (!Array.isArray(entry.hooks)) return false;
    return entry.hooks.some((hook) => isRecord(hook)
      && hook.type === "command"
      && typeof hook.command === "string"
      && isManagedClaudePetsCommand(hook.command));
  });
}

function formatExpectedHook(entry: ExpectedHookEntry) {
  return entry.matcher ? `${entry.hookName}(${entry.matcher})` : entry.hookName;
}

function printDoctorReport(checks: DoctorCheck[]) {
  console.log("Claude Pets doctor\n");
  for (const check of checks) {
    console.log(`${statusIcon(check.status)} ${check.label}: ${check.detail}`);
  }
}

function statusIcon(status: DoctorStatus) {
  if (status === "ok") return "✓";
  if (status === "warn") return "!";
  return "✗";
}

function firstLine(value: string) {
  return value.trim().split(/\r?\n/)[0]?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
