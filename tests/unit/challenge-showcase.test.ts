import { describe, expect, it } from "vitest";
import { JURY_PROFILE_IDS, PROFILES } from "@/data/profiles";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { buildPersonalizedOffer } from "@/lib/personalization";

describe("prueba central del reto", () => {
  const cases = JURY_PROFILE_IDS.map((id) => PROFILES.find((profile) => profile.id === id)!);

  it("muestra categorías A, B y C sobre perfiles sintéticos", () => {
    expect(cases.map((profile) => profile.category)).toEqual(["A", "B", "C"]);
    expect(cases.every((profile) => profile.synthetic)).toBe(true);
  });

  it("genera tres productos y tres canales materialmente diferentes", () => {
    const outputs = cases.map((profile) => {
      const top = calculateAllAffinities(profile)[0]!;
      return { product: top.productId, offer: buildPersonalizedOffer(profile, top) };
    });
    expect(new Set(outputs.map((item) => item.product)).size).toBe(3);
    expect(new Set(outputs.map((item) => item.offer.channel)).size).toBe(3);
  });

  it("usa al menos tres señales diversas y produce mensaje, momento y siguiente paso", () => {
    for (const profile of cases) {
      const top = calculateAllAffinities(profile)[0]!;
      const offer = buildPersonalizedOffer(profile, top);
      expect(top.positiveSignals.length).toBeGreaterThanOrEqual(3);
      expect(offer.message).toContain(profile.fullName.split(" ")[0]);
      expect(offer.timing.length).toBeGreaterThan(15);
      expect(offer.nextStep.length).toBeGreaterThan(10);
    }
  });
});
