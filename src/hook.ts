import { safeSendEvent } from "@openpets/client";
import { mapClaudeEventToOpenPets } from "./map-claude-event.js";

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
  return 0;
}
