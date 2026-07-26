import { describe, expect, it } from "vitest";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import { selectDelivery } from "@/lib/enrichment/channel";

describe("canal de enriquecimiento", () => {
  it("respeta el canal declarado cuando hay permiso", () => {
    const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!;
    expect(selectDelivery(profile.raw, {
      socialDemo: true,
      lifeEvents: true,
      authorizedFinancial: true,
      commercialContact: true,
    }).channel).toBe("WHATSAPP");
  });

  it("permanece en el portal sin autorización comercial", () => {
    const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!;
    expect(selectDelivery(profile.raw, {
      socialDemo: true,
      lifeEvents: true,
      authorizedFinancial: true,
      commercialContact: false,
    }).channel).toBe("IN_APP");
  });
});
