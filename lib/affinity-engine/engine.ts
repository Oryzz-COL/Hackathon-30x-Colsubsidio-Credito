import { BRAND } from "@/config/brand";
import { PRODUCTS, RULES } from "@/config/products";
import type { AffinityResult, ProductId, Profile } from "@/lib/types";

const level = (score: number) =>
  score >= 80 ? "Afinidad muy alta" : score >= 60 ? "Afinidad alta" : score >= 40 ? "Afinidad moderada" : score >= 20 ? "Afinidad baja" : "Evidencia insuficiente o baja afinidad";

export function calculateAffinity(profile: Profile, productId: ProductId): AffinityResult {
  const product = PRODUCTS.find((item) => item.id === productId)!;
  const corpus = profile.needs.join(" ").toLowerCase();
  const rules = RULES.filter((rule) => rule.productId === productId);
  const matched = rules.filter((rule) => rule.matches.some((term) => corpus.includes(term)));
  const categoryTotals = matched.reduce<Record<string, number>>((totals, rule) => {
    totals[rule.category] = Math.min(product.categoryCaps[rule.category] ?? 100, (totals[rule.category] ?? 0) + rule.weight);
    return totals;
  }, {});
  let score = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  if (productId === "compra-cartera" && !profile.declaredObligations) score = 0;
  if (profile.contradiction) score = Math.max(0, score - 12);
  score = Math.min(100, Math.round(score));

  const coverage = Math.min(1, profile.evidence.filter((item) => item.evidenceStatus === "VIGENTE").length / 4);
  const freshnessPenalty = profile.staleSource ? 0.18 : 0;
  const consentFactor = profile.consent ? 1 : 0.35;
  const confidence = Math.round(Math.max(0.1, (0.48 + coverage * 0.42 - freshnessPenalty) * consentFactor) * 100);
  const excluded = ["Huella digital: no utilizada ni penalizada", "Capacidad de pago y riesgo: fuera del índice de afinidad"];
  if (profile.sensitiveBlocked) excluded.push("Dato sensible detectado: bloqueado y excluido");

  return {
    productId,
    affinityScore: score,
    affinityLevel: level(score),
    positiveSignals: matched.map((rule) => rule.label),
    missingSignals: matched.length ? ["Documento soporte opcional", "Validación formal de requisitos"] : ["Necesidad o finalidad declarada", "Evidencia aportada voluntariamente"],
    contradictorySignals: profile.contradiction ? [profile.contradiction] : [],
    excludedSignals: excluded,
    confidence,
    ruleVersion: BRAND.ruleVersion,
    calculatedAt: "2026-07-23T14:00:00.000Z",
    requiresHumanReview: !profile.consent || confidence < 60 || Boolean(profile.contradiction) || Boolean(profile.sensitiveBlocked),
    disclaimer: BRAND.disclaimer,
    eligibility: [
      { label: "Consentimiento para perfilamiento", status: profile.consent ? "CUMPLIDA" : "NO_COMPROBADA" },
      {
        label: "Antigüedad laboral (referencia oficial: 2 meses; 6 si el contrato no es indefinido)",
        status:
          typeof profile.tenureMonths !== "number"
            ? "NO_COMPROBADA"
            : profile.tenureMonths >= (profile.contractType === "Indefinido" ? 2 : 6)
              ? "DECLARADA"
              : "PENDIENTE",
      },
      { label: "Requisitos del producto", status: "PENDIENTE" },
      { label: "Capacidad de pago", status: "NO_COMPROBADA" },
    ],
  };
}

export const calculateAllAffinities = (profile: Profile) =>
  PRODUCTS.map((product) => calculateAffinity(profile, product.id)).sort((a, b) => b.affinityScore - a.affinityScore);
