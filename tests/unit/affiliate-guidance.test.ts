import { describe, expect, it } from "vitest";
import {
  affiliateContactPayload,
  affiliateGuidanceSchema,
  calculateAffiliateGuidance,
  createAffiliateProfile,
  type AffiliateGuidanceInput,
} from "@/lib/affiliate-guidance";

const validInput: AffiliateGuidanceInput = {
  identifier: "1020304050",
  need: "educacion",
  incomeRange: "Entre 1 y 2 SMMLV",
  employmentStatus: "indefinido",
  tenureMonths: 18,
  consent: true,
};

describe("orientación de autogestión", () => {
  it("exige autorización para generar la orientación", () => {
    const parsed = affiliateGuidanceSchema.safeParse({ ...validInput, consent: false });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("Debes autorizar");
    }
  });

  it("reutiliza el motor y recomienda crédito educativo para educación", () => {
    const guidance = calculateAffiliateGuidance(validInput);
    expect(guidance.recommendations).toHaveLength(3);
    expect(guidance.recommendations[0]?.productId).toBe("educativo");
    expect(guidance.recommendations[0]?.affinityScore).toBeGreaterThan(0);
    expect(guidance.profile.origin).toBe("AFFILIATE_SELF_SERVICE");
    expect(guidance.profile.externalDataStatus).toBe("NOT_AVAILABLE_DEMO");
  });

  it("registra procedencia, consentimiento y solicitud de contacto", () => {
    const profile = createAffiliateProfile(validInput, {
      id: "affiliate-case",
      now: "2026-07-24T10:00:00.000Z",
      contactRequested: true,
    });
    const payload = affiliateContactPayload(validInput);

    expect(profile.contactRequestedAt).toBe("2026-07-24T10:00:00.000Z");
    expect(profile.consentDate).toBe("2026-07-24T10:00:00.000Z");
    expect(profile.evidence[0]?.sourceName).toBe("Autogestión del afiliado");
    expect(payload.origin).toBe("AFFILIATE_SELF_SERVICE");
    expect(payload.contactRequested).toBe(true);
  });
});
