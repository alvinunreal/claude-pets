import { createManualEvent, safeSendEvent, type OpenPetsState } from "@open-pets/client";
import { mapClaudeEventToOpenPets } from "./map-claude-event.js";

const terminalStates: OpenPetsState[] = ["success", "error"];

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

  // For terminal states (success/error), immediately send idle so OpenPets
  // temporary success/error animation keeps rendering but fallback becomes idle
  if (terminalStates.includes(event.state)) {
    const idleResult = await safeSendEvent(createManualEvent("idle", { source: "claude-code", type: "claude.auto-idle" }));
    if (!idleResult.ok && process.env.OPENPETS_DEBUG) console.error(idleResult.error);
  }

  return 0;
}
