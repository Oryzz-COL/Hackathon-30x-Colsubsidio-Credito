import { describe, expect, it } from "vitest";
import { conditionFor } from "@/lib/enrichment/conditions";
import type { StaticAffiliateSnapshot } from "@/lib/enrichment/types";

const snapshot: StaticAffiliateSnapshot = {
  fullName: "Caso sintético",
  city: "Bogotá",
  category: "A",
  affiliation: "Activo",
  incomeRange: "$2.000.000 - $4.000.000",
  employerOrSector: "Servicios",
  contractType: "Término indefinido",
  tenureMonths: 18,
};

describe("condiciones de la orientación enriquecida", () => {
  it("presenta libre inversión como un crédito documentado", () => {
    const condition = conditionFor("libre-inversion", snapshot);

    expect(condition).toContain("1 a 150 SMMLV");
    expect(condition).toContain("6 a 72 meses");
    expect(condition).not.toContain("pendiente de validación");
  });
});
