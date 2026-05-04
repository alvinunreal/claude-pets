import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { claudeCodeSettings, mergeClaudeSettings } from "./settings.js";

export function settingsSnippet(command?: string) {
  return JSON.stringify(claudeCodeSettings(command), null, 2);
}

export async function installClaudePets(options: { command?: string } = {}) {
  const targetPath = resolve(process.cwd(), ".claude", "settings.local.json");
  await mkdir(dirname(targetPath), { recursive: true });
  const existing = await readJsonFile(targetPath);
  if (existing?.hooks !== undefined && !isRecord(existing.hooks)) {
    throw new Error(`${targetPath} has non-object hooks; aborting to avoid unsafe merge.`);
  }
  if (existing !== null) await copyFile(targetPath, `${targetPath}.bak-${Date.now()}`);

  const next = mergeClaudeSettings(existing ?? {}, claudeCodeSettings(options.command));
  await writeFile(targetPath, `${JSON.stringify(next, null, 2)}\n`);
  return targetPath;
}

async function readJsonFile(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
