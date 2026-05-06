import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { runHook } from "./hook.js";

describe("runHook", () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.OPENPETS_DEBUG;
  });

  afterEach(() => {
    delete process.env.OPENPETS_DEBUG;
  });

  it("sends success then idle for Stop event", async () => {
    const payload = JSON.stringify({ hook_event_name: "Stop" });
    const stdin = createMockStdin(payload);

    const calls: Array<Record<string, unknown>> = [];
    const safeSendSpy = spyOn(await import("@open-pets/client"), "safeSendEvent").mockImplementation(async (event) => {
      calls.push(event as Record<string, unknown>);
      return { ok: true, error: undefined };
    });

    try {
      await runHook(stdin);

      expect(calls).toHaveLength(2);
      expect(calls[0].state).toBe("success");
      expect(calls[1].state).toBe("idle");
      // Verify idle event has correct metadata
      expect(calls[1].type).toBe("claude.auto-idle");
      expect(calls[1].source).toBe("claude-code");
    } finally {
      safeSendSpy.mockRestore();
    }
  });

  it("sends error then idle for StopFailure event", async () => {
    const payload = JSON.stringify({ hook_event_name: "StopFailure" });
    const stdin = createMockStdin(payload);

    const calls: Array<Record<string, unknown>> = [];
    const safeSendSpy = spyOn(await import("@open-pets/client"), "safeSendEvent").mockImplementation(async (event) => {
      calls.push(event as Record<string, unknown>);
      return { ok: true, error: undefined };
    });

    try {
      await runHook(stdin);

      expect(calls).toHaveLength(2);
      expect(calls[0].state).toBe("error");
      expect(calls[1].state).toBe("idle");
      // Verify idle event has correct metadata
      expect(calls[1].type).toBe("claude.auto-idle");
      expect(calls[1].source).toBe("claude-code");
    } finally {
      safeSendSpy.mockRestore();
    }
  });

  it("sends only one event for non-terminal states", async () => {
    const testCases = [
      { hook_event_name: "UserPromptSubmit", expectedState: "thinking" },
      { hook_event_name: "PreToolUse", tool_name: "Edit", expectedState: "editing" },
      { hook_event_name: "PermissionRequest", expectedState: "waving" },
      { hook_event_name: "Notification", expectedState: "waiting" },
    ];

    for (const testCase of testCases) {
      const payload = JSON.stringify(testCase);
      const stdin = createMockStdin(payload);

      const calls: Array<Record<string, unknown>> = [];
      const safeSendSpy = spyOn(await import("@open-pets/client"), "safeSendEvent").mockImplementation(async (event) => {
        calls.push(event as Record<string, unknown>);
        return { ok: true, error: undefined };
      });

      try {
        await runHook(stdin);

        expect(calls).toHaveLength(1);
        expect(calls[0].state).toBe(testCase.expectedState);
      } finally {
        safeSendSpy.mockRestore();
      }
    }
  });

  it("preserves debug error logging for failed sends", async () => {
    const payload = JSON.stringify({ hook_event_name: "Stop" });
    const stdin = createMockStdin(payload);

    process.env.OPENPETS_DEBUG = "1";
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    const safeSendSpy = spyOn(await import("@open-pets/client"), "safeSendEvent").mockImplementation(async () => {
      return { ok: false, error: { name: "OpenPetsError", code: "UNKNOWN_ERROR", status: 500, message: "Connection failed" } } as any;
    });

    try {
      await runHook(stdin);

      // Should log error for both the success event and the idle event
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    } finally {
      safeSendSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it("returns 0 for unknown events", async () => {
    const payload = JSON.stringify({ hook_event_name: "UnknownEvent" });
    const stdin = createMockStdin(payload);

    const safeSendSpy = spyOn(await import("@open-pets/client"), "safeSendEvent").mockImplementation(async () => {
      return { ok: true, error: undefined };
    });

    try {
      const result = await runHook(stdin);
      expect(result).toBe(0);
      // Should not call safeSendEvent for unknown events
      expect(safeSendSpy).toHaveBeenCalledTimes(0);
    } finally {
      safeSendSpy.mockRestore();
    }
  });

  it("handles invalid JSON gracefully", async () => {
    const stdin = createMockStdin("invalid json");

    const safeSendSpy = spyOn(await import("@open-pets/client"), "safeSendEvent").mockImplementation(async () => {
      return { ok: true, error: undefined };
    });

    try {
      const result = await runHook(stdin);
      expect(result).toBe(0);
      // Should not call safeSendEvent for invalid JSON (treated as empty object, no matching event)
      expect(safeSendSpy).toHaveBeenCalledTimes(0);
    } finally {
      safeSendSpy.mockRestore();
    }
  });
});

function createMockStdin(data: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });
}
