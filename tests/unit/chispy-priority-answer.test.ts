import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { localAnswer } from "@/lib/chispy/agent";
import type { ToolContext } from "@/lib/chispy/tools";

describe("respuesta local de prioridades", () => {
  it("ordena la cola cuando la asesora pregunta por dónde empezar", () => {
    const context: ToolContext = {
      profiles: PROFILES,
      audit: [],
      citations: new Set(),
    };
    const answer = localAnswer("¿Por cuál caso empiezo hoy?", context);

    expect(answer.texto).toContain("Prioridad sugerida");
    expect(answer.fuentes).toContain("Casos del espacio de trabajo · sesión actual");
  });
});
