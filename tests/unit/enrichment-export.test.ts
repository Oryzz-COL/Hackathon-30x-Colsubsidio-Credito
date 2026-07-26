import { describe, expect, it } from "vitest";
import { enrichDocumentBatch } from "@/lib/enrichment/batch";
import { buildEnrichmentCsv } from "@/lib/enrichment/export";

describe("exportación de enriquecimiento", () => {
  it("incluye producto, canal, tres señales, regla y revisión", () => {
    const [result] = enrichDocumentBatch(["1010001001"], {
      socialDemo: true,
      lifeEvents: true,
      authorizedFinancial: true,
      commercialContact: true,
    }, "2026-07-26T12:00:00.000Z");
    const csv = buildEnrichmentCsv([result!]);
    expect(csv).toContain("producto");
    expect(csv).toContain("senal_3");
    expect(csv).toContain("Crédito educativo");
    expect(csv).toContain("signal-affinity-2026.07.1");
    expect(csv).not.toContain("1010001001");
  });
});
