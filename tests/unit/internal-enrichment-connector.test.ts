import { describe, expect, it } from "vitest";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import { internalAffiliateConnector } from "@/lib/connectors/internal-affiliate";

describe("conector interno de afiliación", () => {
  it("separa meta, comportamiento y uso de servicios", () => {
    const signals = internalAffiliateConnector.collect({
      profile: EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!,
      consent: {
        socialDemo: true,
        lifeEvents: true,
        authorizedFinancial: true,
        commercialContact: true,
      },
      now: new Date("2026-07-26T12:00:00.000Z"),
    });

    expect(new Set(signals.map((signal) => signal.family))).toEqual(new Set([
      "DECLARED_GOAL",
      "INTERNAL_BEHAVIOR",
      "SERVICE_USAGE",
    ]));
  });
});
