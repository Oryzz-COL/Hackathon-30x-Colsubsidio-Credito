/**
 * El índice de afinidad, con el recibo incluido.
 *
 * Cada familia de señales aporta puntos y cada penalización los descuenta, y
 * ambas cosas salen en el resultado —no solo una etiqueta bonita—. La razón es
 * el requisito de explicabilidad del reto: una explicación que no coincide con
 * el cálculo real no explica nada, y la única forma de demostrar que coincide
 * es publicar el desglose y dejar que alguien sume.
 *
 * Lo que este índice mide es correspondencia entre lo que la persona declara y
 * lo que el producto resuelve. No mide riesgo, capacidad de pago ni
 * probabilidad de aceptar: eso vive en `lib/decision/engine.ts` y en el estudio
 * de crédito de Colsubsidio.
 */

import { BRAND } from "@/config/brand";
import { PRODUCTS } from "@/config/products";
import type {
  AffinityResult, ProductId, Profile, ScoreAdjustment, SignalContribution,
} from "@/lib/types";

const level = (score: number) =>
  score >= 80 ? "Afinidad muy alta" : score >= 60 ? "Afinidad alta" : score >= 40 ? "Afinidad moderada" : score >= 20 ? "Afinidad baja" : "Evidencia insuficiente o baja afinidad";

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function matches(corpus: string, terms: string[]) {
  const normalized = normalize(corpus);
  return terms.filter((term) => normalized.includes(normalize(term)));
}

/**
 * Penalización por competir contra la meta explícita de la persona.
 *
 * Quien declara "posgrado" tiene una intención concreta. Los demás productos
 * pueden seguir apareciendo como alternativa —a veces el cupo rotativo resuelve
 * mejor una matrícula pequeña— pero no pueden empatar con el producto que la
 * persona pidió. Dieciocho puntos es lo que separa una alternativa de un
 * competidor sin volverla invisible.
 */
const PENALIZACION_META_DISTINTA = 18;

/** Una contradicción en los datos no descalifica: baja la confianza en ellos. */
const PENALIZACION_CONTRADICCION = 12;

export function calculateAffinity(profile: Profile, productId: ProductId, now = new Date()): AffinityResult {
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

  const contributions: SignalContribution[] = sources.flatMap((source) => {
    const found = matches(source.value, product.needs);
    if (!found.length) return [];
    return [{
      key: source.key as SignalContribution["key"],
      label: source.label,
      points: Math.min(source.weight + Math.max(0, found.length - 1) * 3, source.weight + 6),
      matched: found,
    }];
  });

  let score = contributions.reduce((sum, contribution) => sum + contribution.points, 0);
  const adjustments: ScoreAdjustment[] = [];
  let dismissal: string | undefined;

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

  if (primaryProduct && productId !== primaryProduct) {
    score = Math.max(0, score - PENALIZACION_META_DISTINTA);
    const target = PRODUCTS.find((item) => item.id === primaryProduct);
    adjustments.push({
      label: "La meta declarada apunta a otro producto",
      points: -PENALIZACION_META_DISTINTA,
      detail: `Lo que la persona declaró corresponde a ${target?.name ?? primaryProduct}; esta línea queda como alternativa.`,
    });
    dismissal = `Queda por debajo de ${target?.shortName ?? primaryProduct}, que es lo que la persona declaró querer.`;
  }

  if (productId === "compra-cartera" && !profile.declaredObligations) {
    adjustments.push({
      label: "Sin obligaciones declaradas",
      points: -score,
      detail: "Compra de cartera necesita obligaciones con otras entidades declaradas por la persona; no se deducen de ninguna otra fuente.",
    });
    score = 0;
    dismissal = "No hay obligaciones declaradas con otras entidades que consolidar.";
  }

  if (!womenProductApplies) {
    adjustments.push({
      label: "Correspondencia de Crédito Mujer",
      points: -score,
      detail: "La línea se orienta a quienes declaran género mujer. El dato solo se usa aquí y nunca se infiere del nombre.",
    });
    score = 0;
    dismissal = profile.gender
      ? "Crédito Mujer corresponde a quienes declaran género mujer; hay otras líneas para este proyecto."
      : "No hay género declarado, y este dato nunca se deduce del nombre.";
  }

  if (profile.contradiction) {
    score = Math.max(0, score - PENALIZACION_CONTRADICCION);
    adjustments.push({
      label: "Contradicción en los datos declarados",
      points: -PENALIZACION_CONTRADICCION,
      detail: profile.contradiction,
    });
  }

  score = Math.min(100, Math.round(score));
  if (!dismissal && score === 0) {
    dismissal = "Ninguna de las señales declaradas coincide con lo que resuelve este producto.";
  }

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
    contributions,
    adjustments,
    dismissal,
    positiveSignals,
    missingSignals,
    contradictorySignals: profile.contradiction ? [profile.contradiction] : [],
    excludedSignals: excluded,
    confidence,
    ruleVersion: BRAND.ruleVersion,
    /* La fecha del cálculo es parte de la trazabilidad: una recomendación sin
       fecha no se puede auditar contra la versión de regla que la produjo. */
    calculatedAt: now.toISOString(),
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

export const calculateAllAffinities = (profile: Profile, now = new Date()) =>
  PRODUCTS.map((product) => calculateAffinity(profile, product.id, now)).sort((a, b) => b.affinityScore - a.affinityScore);
