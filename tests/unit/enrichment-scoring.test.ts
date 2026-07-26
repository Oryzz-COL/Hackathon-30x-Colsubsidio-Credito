import { describe, expect, it } from "vitest";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import { collectConnectorSignals } from "@/lib/connectors/enrichment-registry";
import { scoreProducts } from "@/lib/enrichment/scoring";

const consent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: true,
  commercialContact: true,
};

describe("puntaje de enriquecimiento", () => {
  it("cuenta como máximo una señal por familia", () => {
    const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!;
    const signals = collectConnectorSignals({
      profile,
      consent,
      now: new Date("2026-07-26T12:00:00.000Z"),
    });
    const score = scoreProducts(signals)[0]!;
    expect(new Set(score.contributions.map((item) => item.family)).size)
      .toBe(score.contributions.length);
  });

  it("elige educación para el caso académico", () => {
    const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!;
    const score = scoreProducts(collectConnectorSignals({
      profile,
      consent,
      now: new Date("2026-07-26T12:00:00.000Z"),
    }))[0]!;
    expect(score.productId).toBe("educativo");
    expect(score.signalFamilies).toBeGreaterThanOrEqual(3);
  });
});
