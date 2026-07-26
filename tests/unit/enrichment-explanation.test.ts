import { describe, expect, it } from "vitest";
import { runEnrichment } from "@/lib/enrichment/engine";

describe("explicación del enriquecimiento", () => {
  it("nombra a la persona y tres señales sin prometer aprobación", () => {
    const result = runEnrichment({
      documentNumber: "1010001001",
      consent: {
        socialDemo: true,
        lifeEvents: true,
        authorizedFinancial: true,
        commercialContact: true,
      },
      now: "2026-07-26T12:00:00.000Z",
    });
    expect(result.recommendation?.reason).toContain("Laura");
    expect(result.recommendation?.reason).toContain("familias de señales independientes");
    expect(result.disclaimer).toMatch(/no aprueba crédito/i);
  });
});
