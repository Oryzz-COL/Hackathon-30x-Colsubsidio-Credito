import { activeTriggers } from "@/lib/exogenous/calendar";
import {
  createSignal,
  lookupReference,
} from "@/lib/enrichment/signal";
import type { EnrichmentConnector } from "@/lib/enrichment/types";

export const publicContextConnector: EnrichmentConnector = {
  id: "public-context",
  name: "Calendario público verificable",
  description: "Ventanas académicas, tributarias y legales según ciudad y fecha.",
  provenance: "EXTERNAL_CONTEXT",
  consentRequired: false,
  health: "OPERATIVE",
  collect(context) {
    return activeTriggers(context.profile.snapshot.city, context.now).map((trigger) => createSignal({
      id: `calendar-${lookupReference(context, trigger.id)}`,
      family: "PUBLIC_CONTEXT",
      label: trigger.label,
      value: trigger.timing,
      productIds: trigger.productIds,
      connectorId: this.id,
      sourceName: trigger.sourceLabel,
      sourceReference: trigger.sourceUrl ?? `CALENDAR-${trigger.id}`,
      sourceType: "PUBLIC_OFFICIAL",
      dataNature: "VERIFIED",
      provenance: this.provenance,
      confidence: trigger.precision === "DIA" ? 0.98 : 0.86,
      observedAt: context.now.toISOString(),
      statusReason: trigger.reason,
    }));
  },
};
