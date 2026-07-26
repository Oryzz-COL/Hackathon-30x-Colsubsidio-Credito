import {
  createSignal,
  expiresAfter,
  lookupReference,
} from "@/lib/enrichment/signal";
import type { EnrichmentConnector } from "@/lib/enrichment/types";

export const declaredPreferenceConnector: EnrichmentConnector = {
  id: "declared-preference",
  name: "Preferencias de contacto",
  description: "Canal y franja elegidos por la persona; nunca inferidos por edad.",
  provenance: "USER_DECLARED",
  consentRequired: true,
  health: "SIMULATED",
  collect(context) {
    const preference = context.profile.raw.preference;
    if (!preference) return [];
    return [createSignal({
      id: `preference-${lookupReference(context, "channel")}`,
      family: "DECLARED_PREFERENCE",
      label: "Canal y horario elegidos",
      value: `${preference.channel} · ${preference.timeBand}`,
      productIds: [],
      connectorId: this.id,
      sourceName: this.name,
      sourceReference: lookupReference(context, "PREF"),
      sourceType: "USER_DECLARED",
      dataNature: "DECLARED",
      provenance: this.provenance,
      confidence: 1,
      observedAt: preference.updatedAt,
      expiresAt: expiresAfter(preference.updatedAt, 365),
      consentPurpose: "COMMERCIAL_CONTACT",
      statusReason: "Preferencia declarada; define la entrega, no el producto.",
    })];
  },
};
