import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { localAnswer } from "@/lib/chispy/agent";
import type { ToolContext } from "@/lib/chispy/tools";

describe("respuesta local sobre un caso", () => {
  it("reconoce el nombre y abre su trazabilidad", () => {
    const profile = PROFILES[0]!;
    const context: ToolContext = {
      profiles: [profile],
      audit: [],
      citations: new Set(),
    };
    const answer = localAnswer(`Explícame la orientación de ${profile.fullName}`, context);

    expect(answer.texto).toContain("Mayor afinidad");
    expect(answer.texto).toContain(profile.id.slice(0, 8));
    expect(answer.fuentes).toContain("Trazabilidad calculada del caso");
  });
});
