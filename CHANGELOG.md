# Changelog

All notable changes to Claude Pets will be documented in this file.

## 0.1.1 - 2026-05-06

- Fix Claude `Stop` and `StopFailure` hooks so success/error animations settle back to idle.
- Map Claude `idle_prompt` notifications to idle instead of waiting.
- Add hook regression tests for terminal auto-idle behavior.

## 0.1.0 - 2026-05-06

- Prepare npm package metadata and dist build.
- Add package-first Claude Code hook install flow.
- Add idempotent install, dry-run, and uninstall behavior.
- Keep Bun as the v0.1 runtime.
