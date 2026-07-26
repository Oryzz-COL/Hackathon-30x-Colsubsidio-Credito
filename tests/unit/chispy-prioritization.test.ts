import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { TOOLS_BY_NAME, type ToolContext } from "@/lib/chispy/tools";

describe("priorización de casos de Chispy", () => {
  it("devuelve una cola corta y aclara que no es aprobación", () => {
    const tool = TOOLS_BY_NAME.get("priorizar_casos");
    const context: ToolContext = {
      profiles: PROFILES,
      audit: [],
      citations: new Set(),
    };
    const result = tool?.run({}, context) ?? "";

    expect(result).toContain("Prioridad sugerida");
    expect(result).toContain("no representa aprobación");
    expect(result.split("\n").length).toBeLessThanOrEqual(7);
  });
});
