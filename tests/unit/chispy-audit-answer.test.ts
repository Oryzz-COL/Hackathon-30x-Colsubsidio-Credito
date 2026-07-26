import { describe, expect, it } from "vitest";
import { localAnswer } from "@/lib/chispy/agent";
import type { ToolContext } from "@/lib/chispy/tools";

describe("resumen local de auditoría", () => {
  it("genera el informe sin depender del proveedor externo", () => {
    const context: ToolContext = {
      profiles: [],
      citations: new Set(),
      audit: [{
        id: "audit-1",
        action: "HUMAN_REVIEW",
        actor: "Daniela Moreno",
        detail: "Caso aprobado para contacto",
        createdAt: "2026-07-26T12:00:00.000Z",
      }],
    };
    const answer = localAnswer("Genera el informe de auditoría de esta sesión", context);

    expect(answer.texto).toContain("Eventos registrados: 1");
    expect(answer.texto).toContain("HUMAN_REVIEW");
    expect(answer.fuentes).toContain("Registro de auditoría de esta sesión");
  });
});
