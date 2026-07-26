import { describe, expect, it } from "vitest";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import { syntheticSocialConnector } from "@/lib/connectors/synthetic-social";

const consent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: true,
  commercialContact: true,
};

describe("conector social sintético", () => {
  it("marca la procedencia externa y la autorización requerida", () => {
    const signal = syntheticSocialConnector.collect({
      profile: EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!,
      consent,
      now: new Date("2026-07-26T12:00:00.000Z"),
    })[0]!;

    expect(signal.provenance).toBe("EXTERNAL_PERSON");
    expect(signal.consentPurpose).toBe("BEHAVIOR_PERSONALIZATION");
    expect(signal.sourceType).toBe("SYNTHETIC_DEMO");
  });

  it("marca temas sensibles para que la política los bloquee", () => {
    const signal = syntheticSocialConnector.collect({
      profile: EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001006")!,
      consent,
      now: new Date("2026-07-26T12:00:00.000Z"),
    })[0]!;
    expect(signal.sensitivity).toBe("SENSITIVE_PROHIBITED");
  });
});
