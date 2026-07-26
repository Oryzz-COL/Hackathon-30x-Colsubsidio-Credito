import { describe, expect, it } from "vitest";
import { rateQuoteFor, RATES } from "@/lib/decision/rates";
import type { RateSelection } from "@/lib/decision/rates";

describe("catálogo de tasas publicadas", () => {
  it.each([
    [{ productId: "libre-inversion", category: "A", paymentMode: "PAYROLL" }, 0.1919, 0.0147],
    [{ productId: "libre-inversion", category: "C", paymentMode: "NON_PAYROLL" }, 0.2394, 0.018],
    [{ productId: "compra-cartera", category: "A", paymentMode: "PAYROLL" }, 0.1529, 0.0119],
    [{ productId: "compra-cartera", category: "D", paymentMode: "NON_PAYROLL" }, 0.2224, 0.0169],
    [{ productId: "cupo-credito", category: "A" }, 0.2494, 0.0187],
    [{ productId: "hipotecario", category: "A", mortgageMode: "UVR" }, 0.0439, 0.0036],
    [{ productId: "hipotecario", category: "A", mortgageMode: "PESOS" }, 0.1199, 0.0095],
    [{ productId: "educativo", category: "B" }, 0.1707, 0.0132],
    [{ productId: "mujeres", category: "A", paymentMode: "PAYROLL" }, 0.183, 0.0141],
    [{ productId: "complementario", category: "C" }, 0.1463, 0.0114],
  ] satisfies Array<[RateSelection, number, number]>)(
    "resuelve $productId para $category",
    (selection, expectedEa, expectedNmv) => {
      const quote = rateQuoteFor(selection);
      expect(quote.annualRate).toBeCloseTo(expectedEa, 4);
      expect(quote.nominalMonthlyRate).toBeCloseTo(expectedNmv, 4);
      expect(quote.exact).toBe(true);
      expect(quote.sourceUrl).toMatch(/^https:\/\/www\.colsubsidio\.com\//);
    }
  );

  it("conserva E.A. y NMV publicadas en vez de recalcular una desde la otra", () => {
    const publishedRates = [
      ...Object.values(RATES.libreInversion.PAYROLL),
      ...Object.values(RATES.libreInversion.NON_PAYROLL),
      ...Object.values(RATES.compraCartera.PAYROLL),
      ...Object.values(RATES.compraCartera.NON_PAYROLL),
      ...Object.values(RATES.cupoCredito),
      ...Object.values(RATES.hipotecario.UVR),
      ...Object.values(RATES.hipotecario.PESOS),
      ...Object.values(RATES.educativo),
      ...Object.values(RATES.mujeres.PAYROLL),
      ...Object.values(RATES.mujeres.NON_PAYROLL),
      ...Object.values(RATES.complementario),
    ];

    for (const rate of publishedRates) {
      const effectiveMonth = Math.pow(1 + rate.ea, 1 / 12) - 1;
      expect(Math.abs(effectiveMonth - rate.nmv)).toBeLessThan(0.00006);
    }
  });

  it("marca las aproximaciones para revisión humana", () => {
    const mortgageCategoryC = rateQuoteFor({
      productId: "hipotecario",
      category: "C",
      mortgageMode: "UVR",
    });
    const rotatingInsurance = rateQuoteFor({
      productId: "seguros-impuestos",
      category: "A",
    });

    expect(mortgageCategoryC.exact).toBe(false);
    expect(mortgageCategoryC.note).toContain("requiere confirmación");
    expect(rotatingInsurance.exact).toBe(false);
    expect(rotatingInsurance.label).toContain("referencia Cupo");
  });
});
