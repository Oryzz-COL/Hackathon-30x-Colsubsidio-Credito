import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/config/products";
import { PROFILES } from "@/data/profiles";
import { calculateAffinity, calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { normalizeDataPoint } from "@/lib/validation/normalize";
import type { ProductId, Profile } from "@/lib/types";

const profileFor = (productId: ProductId) => {
  const product = PRODUCTS.find((p) => p.id === productId)!;
  return { ...PROFILES[0]!, needs: [product.needs[0]!, product.needs[1] ?? product.needs[0]!], declaredObligations: productId === "compra-cartera", consent: true };
};
describe.each(PRODUCTS)("$name", (product) => {
  it.each([
    ["reconoce una necesidad declarada", (p: Profile) => calculateAffinity(p, product.id).affinityScore >= 40],
    ["produce señales explicables", (p: Profile) => calculateAffinity(p, product.id).positiveSignals.length > 0],
    ["separa elegibilidad", (p: Profile) => calculateAffinity(p, product.id).eligibility.some((e) => e.label === "Capacidad de pago" && e.status === "NO_COMPROBADA")],
    ["marca revisión humana", (p: Profile) => calculateAffinity({ ...p, consent: false }, product.id).requiresHumanReview],
    ["incluye versión de reglas", (p: Profile) => calculateAffinity(p, product.id).ruleVersion === "afinidad-2026.07.1"],
  ])("%s", (_, assertion) => expect(assertion(profileFor(product.id))).toBe(true));
});
describe("reglas transversales", () => {
  it("los faltantes reducen confianza, no afinidad", () => { const base = profileFor("educativo"); const sparse = { ...base, evidence: [] }; expect(calculateAffinity(sparse, "educativo").affinityScore).toBe(calculateAffinity(base, "educativo").affinityScore); expect(calculateAffinity(sparse, "educativo").confidence).toBeLessThan(calculateAffinity(base, "educativo").confidence); });
  it("la ausencia de huella digital no penaliza", () => expect(calculateAffinity(profileFor("hipotecario"), "hipotecario").excludedSignals).toContain("Huella digital: no utilizada ni penalizada"));
  it("compra de cartera exige obligaciones declaradas", () => expect(calculateAffinity({ ...profileFor("compra-cartera"), declaredObligations: false }, "compra-cartera").affinityScore).toBe(0));
  it("una contradicción reduce afinidad", () => { const base = profileFor("educativo"); expect(calculateAffinity({ ...base, contradiction: "Fechas incompatibles" }, "educativo").affinityScore).toBeLessThan(calculateAffinity(base, "educativo").affinityScore); });
  it("un dato sensible se excluye", () => expect(calculateAffinity({ ...profileFor("educativo"), sensitiveBlocked: true }, "educativo").excludedSignals.some((s) => s.includes("sensible"))).toBe(true));
  it("una fuente vencida reduce confianza", () => { const base = profileFor("cupo-credito"); expect(calculateAffinity({ ...base, staleSource: true }, "cupo-credito").confidence).toBeLessThan(calculateAffinity(base, "cupo-credito").confidence); });
  it("calcula los ocho productos", () => expect(calculateAllAffinities(PROFILES[0]!).length).toBe(8));
});
describe("normalización", () => {
  const point = { field: "nota", value: "Proyecto personal", sourceType: "USER_DECLARED" as const, sourceName: "Formulario", sourceReference: "F-1", capturedAt: "2026-07-20T10:00:00.000Z", lastVerifiedAt: "2026-07-20T10:00:00.000Z", confidence: .9, consentScope: "PERFILAMIENTO", dataNature: "DECLARED" as const };
  it("normaliza el valor", () => expect(normalizeDataPoint(point).normalizedValue).toBe("PROYECTO PERSONAL"));
  it("LLM no se vuelve verificado", () => expect(normalizeDataPoint({ ...point, sourceType: "LLM_SUMMARY", dataNature: "VERIFIED" }).dataNature).toBe("INFERRED"));
  it("bloquea datos sensibles", () => expect(normalizeDataPoint({ ...point, value: "Diagnóstico médico" }).evidenceStatus).toBe("EXCLUIDA"));
});
