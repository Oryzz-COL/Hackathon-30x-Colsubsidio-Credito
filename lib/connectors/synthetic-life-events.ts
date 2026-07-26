import {
  createSignal,
  expiresAfter,
  lookupReference,
} from "@/lib/enrichment/signal";
import type { EnrichmentConnector } from "@/lib/enrichment/types";

export const syntheticLifeEventsConnector: EnrichmentConnector = {
  id: "synthetic-life-events",
  name: "Eventos de vida · demo autorizada",
  description: "Hitos declarados o conectados voluntariamente por la persona.",
  provenance: "EXTERNAL_PERSON",
  consentRequired: true,
  health: "SIMULATED",
  collect(context) {
    return (context.profile.raw.lifeEvents ?? []).map((item, index) => createSignal({
      id: `life-${lookupReference(context, String(index + 1))}`,
      family: "LIFE_EVENT",
      label: "Momento de vida autorizado",
      value: item.label,
      productIds: item.productIds,
      connectorId: this.id,
      sourceName: this.name,
      sourceReference: lookupReference(context, `LIFE-${index + 1}`),
      sourceType: "SYNTHETIC_DEMO",
      dataNature: "DECLARED",
      provenance: this.provenance,
      confidence: 0.91,
      observedAt: item.declaredAt,
      expiresAt: expiresAfter(item.declaredAt, 180),
      consentPurpose: "BEHAVIOR_PERSONALIZATION",
      statusReason: "Evento de vida sintético declarado para la demostración.",
    }));
  },
};
