import { describe, expect, it } from "vitest";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { createAffiliateProfile, type AffiliateGuidanceInput } from "@/lib/affiliate-guidance";
import { buildNextBestAction, evaluateContactPolicy } from "@/lib/personalization";

const input: AffiliateGuidanceInput = {
  identifier: "1020304050",
  fullName: "Samuel Demo",
  email: "samuel@ejemplo.test",
  addressOrZone: "Bogotá D.C.",
  affiliationCategory: "B",
  gender: "MAN",
  need: "vivienda",
  incomeRange: "",
  employmentStatus: "indefinido",
  tenureMonths: 18,
  termMonths: 24,
  horizon: "NOW",
  preferredChannel: "CALL",
  preferredTimeBand: "WEEKDAY_MORNING",
  contactFrequency: "ONCE_WEEK",
  wantsAdvisor: true,
  interestedProducts: ["hipotecario"],
  guidanceConsent: true,
  behaviorConsent: true,
  contactConsent: true,
  financialDataConsent: false,
  rneExcluded: false,
};

describe("personalización y política de contacto", () => {
  it("permite contacto en horario hábil de Bogotá con autorización", () => {
    const profile = createAffiliateProfile(input);
    const policy = evaluateContactPolicy(profile, new Date("2026-07-23T15:00:00.000Z"));
    expect(policy.allowed).toBe(true);
    expect(policy.channel).toBe("CALL");
  });

  it("bloquea domingos, RNE y revocación", () => {
    const profile = createAffiliateProfile(input);
    expect(evaluateContactPolicy(profile, new Date("2026-07-26T15:00:00.000Z")).allowed).toBe(false);
    expect(evaluateContactPolicy({ ...profile, rneExcluded: true }, new Date("2026-07-23T15:00:00.000Z")).reasons.join(" ")).toContain("RNE");
    const revoked = { ...profile, consents: profile.consents?.map((item) => ({ ...item, status: "REVOKED" as const })) };
    expect(evaluateContactPolicy(revoked, new Date("2026-07-23T15:00:00.000Z")).allowed).toBe(false);
  });

  it("produce una siguiente acción explicable y nunca una aprobación", () => {
    const profile = createAffiliateProfile(input);
    const top = calculateAllAffinities(profile)[0]!;
    const action = buildNextBestAction(profile, top, new Date("2026-07-23T15:00:00.000Z"));
    expect(action.productId).toBe("hipotecario");
    expect(action.requiresHumanReview).toBe(true);
    expect(action.disclaimer).toContain("no representa aprobación");
  });
});
