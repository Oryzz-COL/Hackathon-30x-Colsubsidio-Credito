import {
  createSignal,
  expiresAfter,
  lookupReference,
} from "@/lib/enrichment/signal";
import type { EnrichmentConnector } from "@/lib/enrichment/types";

export const internalAffiliateConnector: EnrichmentConnector = {
  id: "internal-affiliate",
  name: "Perfil interno Colsubsidio · demo",
  description: "Meta, comportamiento propio y servicios usados dentro del ecosistema.",
  provenance: "COLSUBSIDIO_INTERNAL",
  consentRequired: false,
  health: "SIMULATED",
  collect(context) {
    const { raw } = context.profile;
    return [
      ...(raw.declaredGoal ? [
        createSignal({
          id: `goal-${lookupReference(context, "declared")}`,
          family: "DECLARED_GOAL",
          label: "Meta registrada",
          value: raw.declaredGoal.label,
          productIds: raw.declaredGoal.productIds,
          connectorId: this.id,
          sourceName: this.name,
          sourceReference: lookupReference(context, "GOAL"),
          sourceType: "COLSUBSIDIO_INTERNAL",
          dataNature: "DECLARED",
          provenance: this.provenance,
          confidence: 0.98,
          observedAt: context.now.toISOString(),
          statusReason: "Meta declarada previamente en un canal propio de la demostración.",
        }),
      ] : []),
      ...(raw.internalBehavior ?? []).map((item, index) => createSignal({
        id: `behavior-${lookupReference(context, String(index + 1))}`,
        family: "INTERNAL_BEHAVIOR",
        label: "Interacción digital propia",
        value: item.label,
        productIds: item.productIds,
        connectorId: this.id,
        sourceName: "Eventos propios Colsubsidio · demo",
        sourceReference: lookupReference(context, `BEH-${index + 1}`),
        sourceType: "COLSUBSIDIO_INTERNAL",
        dataNature: "OBSERVED",
        provenance: this.provenance,
        confidence: 0.94,
        observedAt: item.occurredAt,
        expiresAt: expiresAfter(item.occurredAt, 30),
        consentPurpose: "BEHAVIOR_PERSONALIZATION",
      })),
      ...(raw.serviceUsage ?? []).map((item, index) => createSignal({
        id: `service-${lookupReference(context, String(index + 1))}`,
        family: "SERVICE_USAGE",
        label: "Uso de servicio",
        value: item.label,
        productIds: item.productIds,
        connectorId: this.id,
        sourceName: "Servicios Colsubsidio · demo",
        sourceReference: lookupReference(context, `SRV-${index + 1}`),
        sourceType: "COLSUBSIDIO_INTERNAL",
        dataNature: "OBSERVED",
        provenance: this.provenance,
        confidence: 0.92,
        observedAt: item.occurredAt,
        expiresAt: expiresAfter(item.occurredAt, 90),
      })),
    ];
  },
};
