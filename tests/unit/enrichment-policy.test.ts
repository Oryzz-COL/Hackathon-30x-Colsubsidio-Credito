import { describe, expect, it } from "vitest";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import { syntheticSocialConnector } from "@/lib/connectors/synthetic-social";
import { applySignalPolicy } from "@/lib/enrichment/policy";

const now = new Date("2026-07-26T12:00:00.000Z");

describe("política de señales externas", () => {
  it("excluye intereses sociales cuando falta autorización", () => {
    const raw = syntheticSocialConnector.collect({
      profile: EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!,
      consent: {
        socialDemo: false,
        lifeEvents: true,
        authorizedFinancial: true,
        commercialContact: true,
      },
      now,
    });
    const [signal] = applySignalPolicy(raw, {
      socialDemo: false,
      lifeEvents: true,
      authorizedFinancial: true,
      commercialContact: true,
    }, now);
    expect(signal?.status).toBe("EXCLUDED_NO_CONSENT");
  });

  it("excluye temas sensibles incluso con autorización", () => {
    const raw = syntheticSocialConnector.collect({
      profile: EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001006")!,
      consent: {
        socialDemo: true,
        lifeEvents: true,
        authorizedFinancial: true,
        commercialContact: true,
      },
      now,
    });
    const [signal] = applySignalPolicy(raw, {
      socialDemo: true,
      lifeEvents: true,
      authorizedFinancial: true,
      commercialContact: true,
    }, now);
    expect(signal?.status).toBe("EXCLUDED_SENSITIVE");
  });
});
