import type {
  EnrichmentConnectorContext,
  EnrichmentSignalStatus,
  ExternalSignal,
  SignalFamily,
} from "@/lib/enrichment/types";
import type { ConsentPurpose, ProductId } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export const SIGNAL_FAMILY_LABELS: Record<SignalFamily, string> = {
  DECLARED_GOAL: "Meta declarada",
  INTERNAL_BEHAVIOR: "Comportamiento propio",
  SERVICE_USAGE: "Uso de servicios",
  EXTERNAL_INTEREST: "Interés externo autorizado",
  LIFE_EVENT: "Evento de vida",
  PUBLIC_CONTEXT: "Contexto público",
  AUTHORIZED_FINANCIAL: "Dato financiero autorizado",
  DECLARED_PREFERENCE: "Preferencia de contacto",
};

export interface SignalFactoryInput {
  id: string;
  family: SignalFamily;
  label: string;
  value: string;
  productIds: ProductId[];
  connectorId: string;
  sourceName: string;
  sourceReference: string;
  sourceType: ExternalSignal["sourceType"];
  dataNature: ExternalSignal["dataNature"];
  provenance: ExternalSignal["provenance"];
  sensitivity?: ExternalSignal["sensitivity"];
  confidence: number;
  observedAt: string;
  expiresAt?: string;
  consentPurpose?: ConsentPurpose;
  status?: EnrichmentSignalStatus;
  statusReason?: string;
}

export function createSignal(input: SignalFactoryInput): ExternalSignal {
  return {
    ...input,
    sensitivity: input.sensitivity ?? "STANDARD",
    status: input.status ?? "ELIGIBLE",
    statusReason: input.statusReason ?? "Señal vigente, trazable y habilitada para la demostración.",
    synthetic: true,
  };
}

export function expiresAfter(observedAt: string, days: number): string {
  return new Date(new Date(observedAt).getTime() + days * DAY).toISOString();
}

export function expireSignal(signal: ExternalSignal, now: Date): ExternalSignal {
  if (!signal.expiresAt || new Date(signal.expiresAt).getTime() >= now.getTime()) return signal;
  return {
    ...signal,
    status: "EXPIRED",
    statusReason: "La señal superó su ventana de vigencia y no participa en la recomendación.",
  };
}

export function lookupReference(context: EnrichmentConnectorContext, suffix: string): string {
  return `${context.profile.documentNumber.slice(-4)}-${suffix}`;
}
