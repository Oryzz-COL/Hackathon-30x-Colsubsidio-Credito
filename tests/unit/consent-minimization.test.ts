import { describe, expect, it } from "vitest";
import {
  createAffiliateProfile,
  type AffiliateGuidanceInput,
} from "@/lib/affiliate-guidance";

describe("minimización de autorizaciones", () => {
  it("orienta con un solo permiso sin activar las finalidades opcionales", () => {
    const input: AffiliateGuidanceInput = {
      identifier: "",
      fullName: "Persona Demo",
      email: "persona@ejemplo.test",
      addressOrZone: "Bogotá D.C.",
      affiliationCategory: "A",
      gender: "PREFER_NOT_TO_SAY",
      need: "educacion",
      incomeRange: "Entre 1 y 2 SMMLV",
      employmentStatus: "indefinido",
      tenureMonths: 12,
      termMonths: 24,
      horizon: "EXPLORING",
      preferredChannel: "IN_APP",
      preferredTimeBand: "WEEKDAY_MORNING",
      contactFrequency: "NO_CONTACT",
      wantsAdvisor: false,
      interestedProducts: ["educativo"],
      guidanceConsent: true,
      behaviorConsent: false,
      contactConsent: false,
      financialDataConsent: false,
      rneExcluded: false,
    };

    const profile = createAffiliateProfile(input, {
      id: "minimal-consent",
      now: "2026-07-26T12:00:00.000Z",
    });

    expect(profile.consents?.map((item) => item.purpose)).toEqual(["GUIDANCE"]);
    expect(profile.behaviorEvents?.some((event) => event.type === "credito_consultado")).toBe(false);
    expect(profile.commercialContactBlocked).toBe(true);
  });
});
