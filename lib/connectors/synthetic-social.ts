import {
  createSignal,
  expiresAfter,
  lookupReference,
} from "@/lib/enrichment/signal";
import type { EnrichmentConnector } from "@/lib/enrichment/types";

export const syntheticSocialConnector: EnrichmentConnector = {
  id: "synthetic-social",
  name: "Social Signals · demo autorizada",
  description: "Intereses sintéticos que simulan una cuenta conectada voluntariamente.",
  provenance: "EXTERNAL_PERSON",
  consentRequired: true,
  health: "SIMULATED",
  collect(context) {
    return (context.profile.raw.socialInterests ?? []).map((item, index) => createSignal({
      id: `social-${lookupReference(context, String(index + 1))}`,
      family: "EXTERNAL_INTEREST",
      label: "Interés externo autorizado",
      value: item.label,
      productIds: item.productIds,
      connectorId: this.id,
      sourceName: this.name,
      sourceReference: lookupReference(context, `SOC-${index + 1}`),
      sourceType: "SYNTHETIC_DEMO",
      dataNature: "OBSERVED",
      provenance: this.provenance,
      sensitivity: item.topicClass === "SENSITIVE" ? "SENSITIVE_PROHIBITED" : "STANDARD",
      confidence: 0.84,
      observedAt: item.observedAt,
      expiresAt: expiresAfter(item.observedAt, 30),
      consentPurpose: "BEHAVIOR_PERSONALIZATION",
      statusReason: "Dato sintético de una conexión social voluntaria; reemplazable por un proveedor autorizado.",
    }));
  },
};
