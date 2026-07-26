import {
  createSignal,
  expiresAfter,
  lookupReference,
} from "@/lib/enrichment/signal";
import type { EnrichmentConnector } from "@/lib/enrichment/types";

export const authorizedFinancialConnector: EnrichmentConnector = {
  id: "authorized-financial",
  name: "Open finance · demo autorizada",
  description: "Obligaciones declaradas y simuladas con autorización expresa.",
  provenance: "EXTERNAL_PERSON",
  consentRequired: true,
  health: "SIMULATED",
  collect(context) {
    return (context.profile.raw.financial ?? []).map((item, index) => createSignal({
      id: `financial-${lookupReference(context, String(index + 1))}`,
      family: "AUTHORIZED_FINANCIAL",
      label: "Obligación externa autorizada",
      value: item.label,
      productIds: item.productIds,
      connectorId: this.id,
      sourceName: this.name,
      sourceReference: lookupReference(context, `FIN-${index + 1}`),
      sourceType: "AUTHORIZED_PROVIDER",
      dataNature: "VERIFIED",
      provenance: this.provenance,
      sensitivity: "FINANCIAL",
      confidence: 0.96,
      observedAt: item.verifiedAt,
      expiresAt: expiresAfter(item.verifiedAt, 30),
      consentPurpose: "AUTHORIZED_FINANCIAL_SIMULATION",
      statusReason: "Simulación de dato financiero que en producción exige conexión y autorización expresas.",
    }));
  },
};
