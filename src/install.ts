import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { claudeCodeSettings, hasClaudePetsHooks, mergeClaudeSettings, removeClaudePetsHooks } from "./settings.js";

export type InstallScope = "user" | "project";

export type SettingsUpdateResult = {
  targetPath: string;
  changed: boolean;
  settings: Record<string, unknown>;
};

export function settingsSnippet(command?: string) {
  return JSON.stringify(claudeCodeSettings(command), null, 2);
}

export async function installClaudePets(options: { command?: string; dryRun?: boolean; scope?: InstallScope } = {}): Promise<SettingsUpdateResult> {
  const targetPath = resolveSettingsPath(options.scope ?? "user");
  const existing = await readJsonFile(targetPath);
  assertSafeHooks(targetPath, existing);

  const next = mergeClaudeSettings(existing ?? {}, claudeCodeSettings(options.command));
  const changed = JSON.stringify(existing ?? {}) !== JSON.stringify(next);
  if (!options.dryRun && changed) {
    await mkdir(dirname(targetPath), { recursive: true });
    if (existing !== null) await copyFile(targetPath, `${targetPath}.bak-${Date.now()}`);
    await writeFile(targetPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  return { targetPath, changed, settings: next };
}

export async function uninstallClaudePets(options: { dryRun?: boolean; scope?: InstallScope } = {}): Promise<SettingsUpdateResult> {
  const targetPath = resolveSettingsPath(options.scope ?? "user");
  const existing = await readJsonFile(targetPath);
  if (existing === null) return { targetPath, changed: false, settings: {} };
  assertSafeHooks(targetPath, existing);

  const next = removeClaudePetsHooks(existing);
  const changed = hasClaudePetsHooks(existing);
  if (!options.dryRun && changed) {
    await copyFile(targetPath, `${targetPath}.bak-${Date.now()}`);
    await writeFile(targetPath, `${JSON.stringify(next, null, 2)}\n`);
  }
  return { targetPath, changed, settings: next };
}

export function resolveSettingsPath(scope: InstallScope) {
  if (scope === "project") return resolve(process.cwd(), ".claude", "settings.local.json");
  return resolve(process.env.CLAUDE_CONFIG_DIR ?? resolve(homedir(), ".claude"), "settings.json");
}

async function readJsonFile(path: string) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!isRecord(parsed)) {
      throw new Error(`${path} must contain a JSON object; aborting to avoid unsafe merge.`);
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function assertSafeHooks(path: string, settings: Record<string, unknown> | null) {
  if (settings?.hooks !== undefined && !isRecord(settings.hooks)) {
    throw new Error(`${path} has non-object hooks; aborting to avoid unsafe merge.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
