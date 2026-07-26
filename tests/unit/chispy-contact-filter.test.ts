import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { TOOLS_BY_NAME, type ToolContext } from "@/lib/chispy/tools";

describe("filtros de contacto de Chispy", () => {
  it("explica qué casos tienen el contacto bloqueado", () => {
    const context: ToolContext = {
      profiles: PROFILES,
      audit: [],
      citations: new Set(),
    };
    const result = TOOLS_BY_NAME.get("consultar_perfiles")
      ?.run({ filtro: "contacto bloqueado" }, context) ?? "";

    expect(result).toContain("política de contacto");
    expect(result).toMatch(/contacto: .*bloquead/i);
    expect(result).not.toContain("Ningún perfil");
  });
});
