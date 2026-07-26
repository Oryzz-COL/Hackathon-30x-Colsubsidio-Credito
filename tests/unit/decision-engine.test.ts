import { describe, expect, it } from "vitest";
import { estimateMonthlyPayment, evaluateDecision, maxAmountForPayment } from "@/lib/decision/engine";

const base = {
  productId: "educativo" as const,
  amount: 12_000_000,
  termMonths: 60,
  incomeRange: "Entre 2 y 4 SMMLV",
  category: "B" as const,
  employmentStatus: "indefinido",
  tenureMonths: 24,
  dependents: 0,
  declaredObligations: false,
  consent: true,
};

describe("motor de viabilidad", () => {
  it("preaprueba un escenario que se sostiene", () => {
    const result = evaluateDecision(base);
    expect(result.status).toBe("PREAPROBADO");
    expect(result.paymentToIncome).toBeLessThan(0.3);
    expect(result.reasons.some((reason) => reason.impact === "BLOQUEANTE")).toBe(false);
  });

  it("rechaza el caso del estudiante que pide 80 millones a 12 meses con un salario mínimo", () => {
    const result = evaluateDecision({
      ...base,
      amount: 80_000_000,
      termMonths: 12,
      incomeRange: "Hasta 1 SMMLV",
      category: "A",
      employmentStatus: "independiente",
      tenureMonths: 24,
      dependents: 0,
    });
    expect(result.status).toBe("NO_VIABLE_HOY");
    expect(result.reasons.some((reason) => reason.label === "Capacidad de pago" && reason.impact === "BLOQUEANTE")).toBe(true);
  });

  it("acompaña el rechazo con un escenario alcanzable", () => {
    const result = evaluateDecision({ ...base, amount: 80_000_000, termMonths: 12, incomeRange: "Hasta 1 SMMLV" });
    expect(result.counterOffer).toBeDefined();
    expect(result.counterOffer!.amount).toBeLessThan(80_000_000);
    expect(result.counterOffer!.monthlyPayment).toBeLessThanOrEqual(result.monthlyPayment);
  });

  it("bloquea por antigüedad insuficiente e indica cuándo se cumple", () => {
    const result = evaluateDecision({ ...base, employmentStatus: "fijo", tenureMonths: 2 });
    expect(result.status).toBe("NO_VIABLE_HOY");
    expect(result.reasons.find((reason) => reason.label === "Antigüedad laboral")?.detail).toContain("4");
  });

  it("pide revisión cuando falta declarar la antigüedad en vez de rechazar", () => {
    const result = evaluateDecision({ ...base, tenureMonths: undefined });
    expect(result.status).toBe("REQUIERE_REVISION");
    expect(result.missing).toContain("Antigüedad laboral declarada");
  });

  it("respeta el tope documentado del cupo rotativo", () => {
    const result = evaluateDecision({ ...base, productId: "cupo-credito", amount: 9_000_000, termMonths: 36 });
    expect(result.status).toBe("NO_VIABLE_HOY");
    expect(result.reasons.some((reason) => reason.label === "Monto solicitado")).toBe(true);
  });

  it("no ofrece Crédito Mujer a quien no declaró género mujer", () => {
    const result = evaluateDecision({ ...base, productId: "mujeres", gender: "MAN", amount: 5_000_000 });
    expect(result.status).toBe("NO_VIABLE_HOY");
    expect(result.reasons.some((reason) => reason.label === "Correspondencia del producto")).toBe(true);
  });

  it("no usa la categoría como penalización cuando el ingreso está declarado", () => {
    const categoriaA = evaluateDecision({ ...base, category: "A" });
    const categoriaC = evaluateDecision({ ...base, category: "C" });
    expect(categoriaA.status).toBe(categoriaC.status);
    expect(categoriaA.estimatedIncome).toBe(categoriaC.estimatedIncome);
  });

  it("mantiene coherentes cuota y monto máximo", () => {
    const payment = estimateMonthlyPayment(10_000_000, 36);
    expect(maxAmountForPayment(payment, 36)).toBeGreaterThan(9_900_000);
    expect(maxAmountForPayment(payment, 36)).toBeLessThan(10_100_000);
  });

  it("aplica la tasa publicada según categoría y modalidad de pago", () => {
    const conLibranza = evaluateDecision({ ...base, employmentStatus: "indefinido", category: "A" });
    const sinLibranza = evaluateDecision({ ...base, employmentStatus: "independiente", category: "A", tenureMonths: 24 });
    expect(conLibranza.annualRate).toBeCloseTo(0.1763, 4);
    expect(sinLibranza.annualRate).toBeCloseTo(0.1912, 4);
    expect(conLibranza.monthlyPayment).toBeLessThan(sinLibranza.monthlyPayment);
    expect(conLibranza.payrollDeduction).toBe(true);
  });

  it("aplica el tope de 15 veces el ingreso declarado", () => {
    const result = evaluateDecision({ ...base, amount: 90_000_000, termMonths: 72, incomeRange: "Entre 1 y 2 SMMLV" });
    expect(result.status).toBe("NO_VIABLE_HOY");
    expect(result.reasons.find((reason) => reason.label === "Monto solicitado")?.detail).toContain("15 veces");
  });

  it("recorta el plazo máximo a 60 meses cuando no hay libranza", () => {
    const result = evaluateDecision({ ...base, employmentStatus: "independiente", tenureMonths: 24, termMonths: 72 });
    expect(result.reasons.some((reason) => reason.label === "Plazo")).toBe(true);
  });

  it("nunca devuelve un estado de rechazo definitivo", () => {
    const result = evaluateDecision({ ...base, amount: 500_000_000, termMonths: 6, incomeRange: "Hasta 1 SMMLV" });
    expect(["PREAPROBADO", "REQUIERE_REVISION", "NO_VIABLE_HOY"]).toContain(result.status);
    expect(result.headline).not.toMatch(/rechaz/i);
  });
});
