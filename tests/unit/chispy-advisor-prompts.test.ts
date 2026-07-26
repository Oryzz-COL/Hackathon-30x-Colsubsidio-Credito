import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { localAnswer } from "@/lib/chispy/agent";
import type { ToolContext } from "@/lib/chispy/tools";

const context: ToolContext = {
  profiles: PROFILES,
  audit: [],
  citations: new Set(),
};

describe("preguntas sugeridas para la persona asesora", () => {
  it("explica los bloqueos de contacto del workspace", () => {
    const answer = localAnswer("Dime qué casos tienen el contacto bloqueado y por qué", context);

    expect(answer.texto).toContain("política de contacto");
    expect(answer.fuentes).toContain("Casos y políticas de contacto del workspace");
  });

  it("abre la trazabilidad antes de contactar un caso", () => {
    const profile = PROFILES[0]!;
    const answer = localAnswer(`¿Qué debo validar antes de contactar a ${profile.fullName}?`, context);

    expect(answer.texto).toContain(`Caso ${profile.id.slice(0, 8)}`);
    expect(answer.texto).toContain("Faltantes:");
    expect(answer.fuentes).toContain("Trazabilidad calculada del caso");
  });
});
