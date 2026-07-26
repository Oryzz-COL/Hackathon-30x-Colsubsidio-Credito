import { describe, expect, it } from "vitest";
import { enrichmentRequestSchema } from "@/lib/enrichment/schema";

const consent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: false,
  commercialContact: true,
};

describe("contrato de la API de enriquecimiento", () => {
  it("acepta una cédula y normaliza separadores", () => {
    const parsed = enrichmentRequestSchema.parse({
      documentNumber: "1.010.001.001",
      consent,
    });
    expect(parsed.documentNumber).toBe("1010001001");
  });

  it("rechaza recibir una cédula y un lote a la vez", () => {
    expect(enrichmentRequestSchema.safeParse({
      documentNumber: "1010001001",
      documents: ["1010001002"],
      consent,
    }).success).toBe(false);
  });
});
