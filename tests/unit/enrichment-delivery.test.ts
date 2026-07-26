import { describe, expect, it } from "vitest";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import {
  simulateEnrichmentDelivery,
} from "@/lib/enrichment/delivery";
import { runEnrichment } from "@/lib/enrichment/engine";

describe("entrega de la oferta enriquecida", () => {
  it("crea una pieza del canal elegido sin exponer el destino", () => {
    const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!;
    const result = runEnrichment({
      documentNumber: profile.documentNumber,
      consent: {
        socialDemo: true,
        lifeEvents: true,
        authorizedFinancial: true,
        commercialContact: true,
      },
      now: "2026-07-26T12:00:00.000Z",
    });
    const receipt = simulateEnrichmentDelivery(
      result,
      profile,
      new Date("2026-07-26T12:05:00.000Z")
    )!;
    expect(receipt.channel).toBe("WHATSAPP");
    expect(receipt.destinationMasked).toBe("••• ••• 1001");
    expect(receipt.piece.body).toContain("Laura");
    expect(JSON.stringify(receipt)).not.toContain(profile.phone);
  });
});
