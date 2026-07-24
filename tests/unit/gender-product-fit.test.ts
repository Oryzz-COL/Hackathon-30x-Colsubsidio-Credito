import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { calculateAffinity, calculateAllAffinities } from "@/lib/affinity-engine/engine";

const entrepreneurshipProfile = {
  ...PROFILES[2]!,
  needs: ["emprendimiento", "capital de trabajo", "proyecto productivo"],
  declaredGoal: "Hacer crecer un emprendimiento",
  declaredInterests: ["Emprendimiento", "Capital de trabajo"],
  serviceUsage: ["Emprendimiento"],
};

describe("correspondencia de Crédito Mujer", () => {
  it("no recomienda Crédito Mujer a un hombre aunque el nombre o la necesidad coincidan", () => {
    const profile = { ...entrepreneurshipProfile, fullName: "Juan Camilo", gender: "MAN" as const };

    expect(calculateAffinity(profile, "mujeres").affinityScore).toBe(0);
    expect(calculateAllAffinities(profile)[0]?.productId).not.toBe("mujeres");
  });

  it("permite Crédito Mujer cuando el género declarado es Mujer", () => {
    const profile = { ...entrepreneurshipProfile, fullName: "Laura Cárdenas", gender: "WOMAN" as const };

    expect(calculateAffinity(profile, "mujeres").affinityScore).toBeGreaterThan(0);
    expect(calculateAllAffinities(profile)[0]?.productId).toBe("mujeres");
  });

  it("no infiere el género a partir del nombre", () => {
    const profile = { ...entrepreneurshipProfile, fullName: "Laura Cárdenas", gender: undefined };
    const result = calculateAffinity(profile, "mujeres");

    expect(result.affinityScore).toBe(0);
    expect(result.missingSignals).toContain(
      "Crédito Mujer solo se presenta cuando el género declarado es Mujer"
    );
  });

  it("no altera la afinidad de los demás productos", () => {
    const woman = calculateAffinity({ ...entrepreneurshipProfile, gender: "WOMAN" }, "libre-inversion");
    const man = calculateAffinity({ ...entrepreneurshipProfile, gender: "MAN" }, "libre-inversion");

    expect(man.affinityScore).toBe(woman.affinityScore);
  });
});
