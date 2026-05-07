import { readFileSync } from "node:fs";

export const PACKAGE_NAME = "@open-pets/claude-pets";

export function getPackageVersion() {
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as {
    version?: unknown;
  };
  if (typeof packageJson.version !== "string" || packageJson.version.trim() === "") {
    throw new Error("Unable to read claude-pets package version.");
  }
  return packageJson.version;
}

export function getPublishedHookCommand(version = getPackageVersion()) {
  return `bunx --bun ${PACKAGE_NAME}@${version} hook`;
}
