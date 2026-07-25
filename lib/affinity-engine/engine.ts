import { BRAND } from "@/config/brand";
import { PRODUCTS } from "@/config/products";
import type { AffinityResult, ProductId, Profile } from "@/lib/types";

const level = (score: number) =>
  score >= 80 ? "Afinidad muy alta" : score >= 60 ? "Afinidad alta" : score >= 40 ? "Afinidad moderada" : score >= 20 ? "Afinidad baja" : "Evidencia insuficiente o baja afinidad";

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function matches(corpus: string, terms: string[]) {
  const normalized = normalize(corpus);
  return terms.filter((term) => normalized.includes(normalize(term)));
}

export function calculateAffinity(profile: Profile, productId: ProductId): AffinityResult {
  const product = PRODUCTS.find((item) => item.id === productId)!;
  const womenProductApplies = productId !== "mujeres" || profile.gender === "WOMAN";
  const productBehaviorEvents = (profile.behaviorEvents ?? []).filter(
    (event) => event.productId === productId
  );
  const sources = [
    {
      key: "goal",
      value: [...profile.needs, profile.declaredGoal, profile.estimatedNeedRange].filter(Boolean).join(" "),
      weight: 44,
      label: profile.declaredGoal ? `Meta declarada: ${profile.declaredGoal}` : `Necesidad declarada compatible con ${product.shortName}`,
    },
    {
      key: "behavior",
      value: [
        ...(profile.digitalInteractions ?? []),
        ...productBehaviorEvents.flatMap((event) => [
          event.type,
          event.label ?? "",
          ...product.needs,
        ]),
      ].join(" "),
      weight: Math.min(42, 18 + Math.max(0, productBehaviorEvents.length - 1) * 12),
      label: productBehaviorEvents.length
        ? `${productBehaviorEvents.length} interacciones propias recientes y autorizadas`
        : profile.digitalInteractions?.[0]
          ? `Interacción autorizada: ${profile.digitalInteractions[0]}`
          : "Interacción propia relacionada con el producto",
    },
    {
      key: "services",
      value: (profile.serviceUsage ?? []).join(" "),
      weight: 14,
      label: profile.serviceUsage?.[0] ? `Uso de servicios relacionado: ${profile.serviceUsage[0]}` : "Uso de servicios relacionado",
    },
    {
      key: "interests",
      value: (profile.declaredInterests ?? []).join(" "),
      weight: 14,
      label: profile.declaredInterests?.[0] ? `Interés declarado: ${profile.declaredInterests[0]}` : "Interés declarado relacionado",
    },
    {
      key: "moment",
      value: `${profile.lifeEvent ?? ""} ${profile.declaredGoal ?? ""}`,
      weight: 10,
      label: profile.lifeEvent ? `Momento de vida: ${profile.lifeEvent}` : "Momento de vida compatible",
    },
  ];

  const contributions = sources.flatMap((source) => {
    const found = matches(source.value, product.needs);
    if (!found.length) return [];
    return [{ ...source, score: Math.min(source.weight + Math.max(0, found.length - 1) * 3, source.weight + 6) }];
  });

  let score = contributions.reduce((sum, contribution) => sum + contribution.score, 0);
  const declaredCorpus = normalize(`${profile.needs.join(" ")} ${profile.declaredGoal ?? ""}`);
  const primaryProduct: ProductId | undefined =
    /posgrado|pregrado|matricula|educacion|estudio/.test(declaredCorpus) ? "educativo"
    : /vivienda|cuota inicial|hipotec/.test(declaredCorpus) ? "hipotecario"
    : /emprend|capital de trabajo|proyecto productivo/.test(declaredCorpus) ? "mujeres"
    : /cartera|consolidar|obligaciones/.test(declaredCorpus) ? "compra-cartera"
    : /impuesto|seguro/.test(declaredCorpus) ? "seguros-impuestos"
    : /remodel|acabados|mejoras del hogar/.test(declaredCorpus) ? "complementario"
    : /tecnologia|compras cotidianas|disponibilidad reutilizable/.test(declaredCorpus) ? "cupo-credito"
    : undefined;
  if (primaryProduct && productId !== primaryProduct) score = Math.max(0, score - 18);
  if (productId === "compra-cartera" && !profile.declaredObligations) score = 0;
  if (!womenProductApplies) score = 0;
  if (profile.contradiction) score = Math.max(0, score - 12);
  score = Math.min(100, Math.round(score));

  const coverage = Math.min(1, profile.evidence.filter((item) => item.evidenceStatus === "VIGENTE").length / 5);
  const sourceDiversity = Math.min(1, new Set(contributions.map((item) => item.key)).size / 3);
  const freshnessPenalty = profile.staleSource ? 0.18 : 0;
  const consentFactor = profile.consent ? 1 : 0.35;
  const confidence = Math.round(Math.max(0.1, (0.42 + coverage * 0.3 + sourceDiversity * 0.18 - freshnessPenalty) * consentFactor) * 100);
  const excluded = [
    "Huella digital: no utilizada ni penalizada",
    "Edad: nunca usada como decisión adversa",
    "Género declarado: solo valida la correspondencia de Crédito Mujer; no altera las demás afinidades",
    "Capacidad de pago y riesgo: fuera del índice de afinidad",
    "Burós externos: prohibidos y no consultados",
  ];
  if (profile.sensitiveBlocked) excluded.push("Dato sensible detectado: bloqueado y excluido");

  const positiveSignals = score === 0 ? [] : contributions.map((item) => item.label);
  const missingSignals = [
    ...(positiveSignals.length < 3 ? ["Se requieren al menos tres señales diversas para una oferta proactiva"] : []),
    ...(!profile.lifeEvent ? ["Momento de vida declarado"] : []),
    ...(!profile.preferences?.preferredChannel ? ["Preferencia de canal"] : []),
    ...(productId === "mujeres" && !womenProductApplies
      ? ["Crédito Mujer solo se presenta cuando el género declarado es Mujer"]
      : []),
    "Validación formal de requisitos",
  ];

  return {
    productId,
    affinityScore: score,
    affinityLevel: level(score),
    positiveSignals,
    missingSignals,
    contradictorySignals: profile.contradiction ? [profile.contradiction] : [],
    excludedSignals: excluded,
    confidence,
    ruleVersion: BRAND.ruleVersion,
    calculatedAt: "2026-07-24T14:00:00.000Z",
    requiresHumanReview: true,
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
      ...(productId === "mujeres"
        ? [{
            label: "Género declarado para Crédito Mujer",
            status: profile.gender === "WOMAN" ? "DECLARADA" as const : "NO_APLICA" as const,
          }]
        : []),
      { label: "Capacidad de pago", status: "NO_COMPROBADA" },
    ],
  };
}

export const calculateAllAffinities = (profile: Profile) =>
  PRODUCTS.map((product) => calculateAffinity(profile, product.id)).sort((a, b) => b.affinityScore - a.affinityScore);
