import type {
  EnrichmentRecommendation,
  ExternalSignal,
  StaticAffiliateSnapshot,
} from "@/lib/enrichment/types";

const short = (value: string) =>
  value.charAt(0).toLowerCase() + value.slice(1).replace(/[.]$/, "");

export function explainRecommendation(
  productName: string,
  snapshot: StaticAffiliateSnapshot,
  contributions: EnrichmentRecommendation["contributions"]
): string {
  const evidence = contributions
    .slice(0, 3)
    .map((contribution) => short(contribution.signalLabel));

  if (evidence.length === 0) {
    return `${productName} aparece como una opción para explorar, pero faltan señales diversas antes de personalizar una oferta.`;
  }

  const lead = evidence.length === 1
    ? evidence[0]
    : `${evidence.slice(0, -1).join(", ")} y ${evidence.at(-1)}`;

  return `${snapshot.fullName.split(" ")[0]}, esta opción se diseñó para ti porque ${lead}. ${contributions.length} familias de señales independientes sustentan la recomendación.`;
}

export function explainTiming(signals: ExternalSignal[]): string {
  const publicContext = signals.find((signal) => signal.family === "PUBLIC_CONTEXT");
  if (publicContext) return `${publicContext.value}. ${publicContext.statusReason}`;

  const lifeEvent = signals.find((signal) => signal.family === "LIFE_EVENT");
  if (lifeEvent) return `${lifeEvent.value}; es un momento declarado por la persona, no inferido por el sistema.`;

  const behavior = signals.find((signal) => signal.family === "INTERNAL_BEHAVIOR");
  if (behavior) return `${behavior.value}; la señal es reciente y proviene de un canal propio autorizado.`;

  return "No existe un disparador temporal suficiente; la orientación permanece disponible en el portal sin interrumpir a la persona.";
}
