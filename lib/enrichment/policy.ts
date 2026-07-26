import type {
  EnrichmentConsent,
  ExternalSignal,
} from "@/lib/enrichment/types";

const consentByPurpose = (
  signal: ExternalSignal,
  consent: EnrichmentConsent
): boolean => {
  if (signal.family === "EXTERNAL_INTEREST") return consent.socialDemo;
  if (signal.family === "LIFE_EVENT") return consent.lifeEvents;
  if (signal.family === "AUTHORIZED_FINANCIAL") return consent.authorizedFinancial;
  if (signal.family === "DECLARED_PREFERENCE") return consent.commercialContact;
  return true;
};

export function applySignalPolicy(
  signals: ExternalSignal[],
  consent: EnrichmentConsent,
  now: Date
): ExternalSignal[] {
  return signals.map((signal) => {
    if (signal.sensitivity === "SENSITIVE_PROHIBITED") {
      return {
        ...signal,
        status: "EXCLUDED_SENSITIVE",
        statusReason: "Creasy bloquea categorías sensibles; no se muestran ni se puntúan.",
      };
    }

    if (!consentByPurpose(signal, consent)) {
      return {
        ...signal,
        status: "EXCLUDED_NO_CONSENT",
        statusReason: "La finalidad correspondiente no está autorizada.",
      };
    }

    if (signal.expiresAt && new Date(signal.expiresAt).getTime() < now.getTime()) {
      return {
        ...signal,
        status: "EXPIRED",
        statusReason: "La señal venció y no participa en la recomendación.",
      };
    }

    return signal;
  });
}

export function partitionSignals(signals: ExternalSignal[]) {
  return {
    eligibleSignals: signals.filter((signal) => signal.status === "ELIGIBLE"),
    excludedSignals: signals.filter((signal) => signal.status !== "ELIGIBLE"),
  };
}

export const SIGNAL_GUARDRAILS = [
  "No inferir política, religión, salud, orientación sexual, biometría ni origen étnico.",
  "No interpretar la ausencia de actividad digital como una señal negativa.",
  "No usar fotografías, nombres o seguidores para inferir identidad o capacidad de pago.",
  "No consultar burós ni bases compradas: el reto los deja fuera del alcance.",
] as const;
