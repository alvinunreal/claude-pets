import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectDoctorChecks, runDoctor } from "./doctor.js";
import { claudeCodeSettings } from "./settings.js";
import { getPublishedHookCommand } from "./version.js";

const originalCwd = process.cwd();
const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
const tempDirs: string[] = [];

afterEach(async () => {
  process.chdir(originalCwd);
  if (originalClaudeConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("collectDoctorChecks", () => {
  it("reports installed current hooks", async () => {
    const dir = await tempProject();
    process.env.CLAUDE_CONFIG_DIR = join(dir, ".claude-user");
    await writeUserSettings(dir, claudeCodeSettings(getPublishedHookCommand()));

    const healthSpy = spyOn(await import("@open-pets/client"), "getHealth").mockImplementation(async () => ({ activePet: "Slayer" } as any));
    try {
      const checks = await collectDoctorChecks();
      expect(checks.find((check) => check.label === "Claude Pets hooks")).toMatchObject({ status: "ok" });
      expect(checks.find((check) => check.label === "Hook version")).toMatchObject({ status: "ok" });
      expect(checks.find((check) => check.label === "OpenPets desktop")).toMatchObject({ status: "ok" });
    } finally {
      healthSpy.mockRestore();
    }
  });

  it("warns about partial hook installs", async () => {
    const dir = await tempProject();
    process.env.CLAUDE_CONFIG_DIR = join(dir, ".claude-user");
    await writeUserSettings(dir, {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: getPublishedHookCommand() }] }],
      },
    });

    const healthSpy = spyOn(await import("@open-pets/client"), "getHealth").mockImplementation(async () => ({ activePet: null } as any));
    try {
      const checks = await collectDoctorChecks();
      expect(checks.find((check) => check.label === "Claude Pets hooks")).toMatchObject({ status: "warn" });
      expect(checks.find((check) => check.label === "Claude Pets hooks")?.detail).toContain("partial install");
      expect(checks.find((check) => check.label === "Claude Pets hooks")?.detail).toContain("UserPromptSubmit");
    } finally {
      healthSpy.mockRestore();
    }
  });

  it("warns about stale hook versions", async () => {
    const dir = await tempProject();
    process.chdir(dir);
    const staleVersion = ["0", "1", "0"].join(".");
    await writeProjectSettings(dir, {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: `bunx --bun @open-pets/claude-pets@${staleVersion} hook` }] }],
      },
    });

    const healthSpy = spyOn(await import("@open-pets/client"), "getHealth").mockImplementation(async () => { throw new Error("not running"); });
    try {
      const checks = await collectDoctorChecks("project");
      expect(checks.find((check) => check.label === "Hook version")).toMatchObject({ status: "warn" });
      expect(checks.find((check) => check.label === "OpenPets desktop")).toMatchObject({ status: "warn" });
    } finally {
      healthSpy.mockRestore();
    }
  });

  it("warns when hook version cannot be checked for local commands", async () => {
    const dir = await tempProject();
    process.env.CLAUDE_CONFIG_DIR = join(dir, ".claude-user");
    await writeUserSettings(dir, claudeCodeSettings("bun /tmp/claude-pets/src/cli.ts hook"));

    const healthSpy = spyOn(await import("@open-pets/client"), "getHealth").mockImplementation(async () => ({ activePet: null } as any));
    try {
      const checks = await collectDoctorChecks();
      expect(checks.find((check) => check.label === "Claude Pets hooks")).toMatchObject({ status: "ok" });
      expect(checks.find((check) => check.label === "Hook version")).toMatchObject({ status: "warn" });
      expect(checks.find((check) => check.label === "Hook version")?.detail).toContain("version check skipped");
    } finally {
      healthSpy.mockRestore();
    }
  });

  it("returns failure exit code for malformed settings", async () => {
    const dir = await tempProject();
    process.chdir(dir);
    await writeProjectSettings(dir, []);

    const healthSpy = spyOn(await import("@open-pets/client"), "getHealth").mockImplementation(async () => ({ activePet: null } as any));
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(runDoctor({ scope: "project" })).resolves.toBe(1);
    } finally {
      healthSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });
});

async function tempProject() {
  const dir = await mkdtemp(join(tmpdir(), "claude-pets-doctor-test-"));
  tempDirs.push(dir);
  return dir;
}

async function writeUserSettings(dir: string, settings: unknown) {
  const configDir = join(dir, ".claude-user");
  await Bun.$`mkdir -p ${configDir}`.quiet();
  await writeFile(join(configDir, "settings.json"), `${JSON.stringify(settings, null, 2)}\n`);
}

async function writeProjectSettings(dir: string, settings: unknown) {
  const configDir = join(dir, ".claude");
  await Bun.$`mkdir -p ${configDir}`.quiet();
  await writeFile(join(configDir, "settings.local.json"), `${JSON.stringify(settings, null, 2)}\n`);
}
