import { describe, expect, it } from "vitest";
import { runEnrichment } from "@/lib/enrichment/engine";

const consent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: true,
  commercialContact: true,
};

describe("motor de enriquecimiento por cédula", () => {
  it("enriquece un perfil conocido sin devolver la cédula completa", () => {
    const result = runEnrichment({
      documentNumber: "1010001001",
      consent,
      now: "2026-07-26T12:00:00.000Z",
    });
    expect(result.status).toBe("ENRICHED");
    expect(result.documentMasked).toBe("10••••01");
    expect(JSON.stringify(result)).not.toContain("1010001001");
    expect(result.after?.activeSignalFamilies).toBeGreaterThanOrEqual(3);
  });

  it("no inventa información para una cédula desconocida", () => {
    const result = runEnrichment({
      documentNumber: "9999999999",
      consent,
      now: "2026-07-26T12:00:00.000Z",
    });
    expect(result.status).toBe("NOT_FOUND");
    expect(result.recommendation).toBeUndefined();
    expect(result.eligibleSignals).toHaveLength(0);
  });
});
