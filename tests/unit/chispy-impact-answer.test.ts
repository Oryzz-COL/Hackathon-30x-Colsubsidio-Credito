import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { localAnswer } from "@/lib/chispy/agent";
import type { ToolContext } from "@/lib/chispy/tools";

describe("respuesta local de impacto", () => {
  it("calcula cifras del espacio de trabajo en vez de responder de forma genérica", () => {
    const context: ToolContext = {
      profiles: PROFILES,
      audit: [],
      citations: new Set(),
    };
    const answer = localAnswer("Muéstrame los indicadores de impacto", context);

    expect(answer.texto).toContain(`Perfiles analizados: ${PROFILES.length}`);
    expect(answer.texto).toContain("Decisiones automáticas de aprobación o rechazo: 0");
  });
});
