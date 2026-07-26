import { describe, expect, it } from "vitest";
import {
  ENRICHMENT_BATCH_LIMIT,
  enrichDocumentBatch,
  parseDocumentBatch,
  summarizeEnrichmentBatch,
} from "@/lib/enrichment/batch";

const consent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: true,
  commercialContact: true,
};

describe("lotes de enriquecimiento", () => {
  it("acepta csv, tabuladores y saltos de línea sin duplicar", () => {
    expect(parseDocumentBatch("1010001001,1010001002\n1010001001\t1010001003"))
      .toEqual(["1010001001", "1010001002", "1010001003"]);
  });

  it("aplica el límite de dos mil documentos", () => {
    const input = Array.from({ length: ENRICHMENT_BATCH_LIMIT + 10 }, (_, index) =>
      String(1_010_000_000 + index)
    ).join("\n");
    expect(parseDocumentBatch(input)).toHaveLength(ENRICHMENT_BATCH_LIMIT);
  });

  it("resume productos y canales del lote", () => {
    const results = enrichDocumentBatch(
      ["1010001001", "1010001002", "9999999999"],
      consent,
      "2026-07-26T12:00:00.000Z"
    );
    const summary = summarizeEnrichmentBatch(results);
    expect(summary).toMatchObject({ total: 3, enriched: 2, notFound: 1, products: 2, channels: 2 });
  });
});
