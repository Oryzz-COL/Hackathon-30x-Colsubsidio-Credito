import { describe, expect, it } from "vitest";
import { chispyRequestSchema } from "@/app/api/chispy/route";

describe("contrato de contexto para Chispy", () => {
  it("acepta un snapshot de auditoría pequeño y estructurado", () => {
    const result = chispyRequestSchema.safeParse({
      query: "Genera el informe de auditoría",
      audit: [{
        id: "event-1",
        action: "HUMAN_REVIEW",
        actor: "Asesora demo",
        detail: "Caso revisado sin PII",
        createdAt: "2026-07-26T12:00:00.000Z",
      }],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza snapshots excesivos", () => {
    const audit = Array.from({ length: 101 }, (_, index) => ({
      id: `event-${index}`,
      action: "TEST",
      actor: "Demo",
      detail: "Evento",
      createdAt: "2026-07-26T12:00:00.000Z",
    }));
    expect(chispyRequestSchema.safeParse({ query: "Resume", audit }).success).toBe(false);
  });
});
