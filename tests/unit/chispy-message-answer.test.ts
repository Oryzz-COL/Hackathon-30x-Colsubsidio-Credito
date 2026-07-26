import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { localAnswer } from "@/lib/chispy/agent";
import type { ToolContext } from "@/lib/chispy/tools";

describe("respuesta local para contacto", () => {
  it("respeta la política del perfil al preparar un mensaje", () => {
    const profile = PROFILES.find((item) => item.consent) ?? PROFILES[0]!;
    const context: ToolContext = {
      profiles: [profile],
      audit: [],
      citations: new Set(),
    };
    const answer = localAnswer(`Prepara un mensaje para ${profile.fullName}`, context);

    expect(answer.texto).toMatch(/Canal autorizado|No se puede preparar/);
    expect(answer.fuentes).toContain("Perfil y permisos de contacto de esta sesión");
  });
});
