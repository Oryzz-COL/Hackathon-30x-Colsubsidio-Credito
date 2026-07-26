/**
 * Chispy servido como stream NDJSON: una línea de JSON por evento.
 *
 * El cliente lo lee con un reader y pinta según llega, de modo que se ve al
 * agente elegir herramientas en lugar de esperar el bloque final. Es la misma
 * técnica que hace legible cualquier pipeline lento.
 */

import { runChispy, type ChispyEvent } from "@/lib/chispy/agent";
import { budgetNotice, checkBudget, MAX_QUERY_LENGTH } from "@/lib/chispy/guardrails";
import { chispyRequestSchema } from "@/lib/chispy/request-schema";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = chispyRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", max: MAX_QUERY_LENGTH }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const budget = checkBudget(ip);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: ChispyEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        await runChispy({
          query: parsed.data.query,
          profiles: store.list(),
          audit: parsed.data.audit ?? store.audit(),
          emit,
          useModel: budget.allowed,
          notice: budget.allowed ? undefined : budgetNotice(budget.reason),
        });
      } catch {
        emit({ tipo: "error", mensaje: "No fue posible completar la consulta. Vuelve a intentarlo." });
      } finally {
        /* La consulta se registra, su texto no: la auditoría no guarda PII. */
        store.log({
          action: "ASSISTANT_QUERY",
          actor: "Chispy",
          detail: `Consulta procesada ${budget.allowed ? "con modelo" : "con motor local"}; texto y PII no almacenados`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
