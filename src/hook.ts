import { createManualEvent, safeSendEvent, type OpenPetsState } from "@open-pets/client";
import { mapClaudeEventToOpenPets } from "./map-claude-event.js";

const autoIdleDelaysMs: Partial<Record<OpenPetsState, number>> = {
  success: 2000,
  error: 2600,
  warning: 2400,
  celebrating: 2400,
};

export async function runHook(stdin: ReadableStream<Uint8Array> = Bun.stdin.stream()) {
  const body = await new Response(stdin).text().catch(() => "{}");
  let payload: unknown = {};
  try {
    payload = JSON.parse(body);
  } catch {
    payload = {};
  }

  const event = mapClaudeEventToOpenPets(payload);
  if (!event) return 0;

  const result = await safeSendEvent(event);
  if (!result.ok && process.env.OPENPETS_DEBUG) console.error(result.error);
  await autoReturnToIdle(event.state);
  return 0;
}

async function autoReturnToIdle(state: OpenPetsState) {
  const delayMs = autoIdleDelaysMs[state];
  if (!delayMs) return;
  await Bun.sleep(delayMs);
  const result = await safeSendEvent(createManualEvent("idle", { source: "claude-code", type: "claude.auto-idle" }));
  if (!result.ok && process.env.OPENPETS_DEBUG) console.error(result.error);
}
