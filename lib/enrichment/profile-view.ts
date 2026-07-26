import {
  ENRICHMENT_CHANNEL_LABELS,
} from "@/lib/enrichment/channel";
import type {
  EnrichedProfileView,
  ExternalSignal,
  SyntheticExternalProfile,
} from "@/lib/enrichment/types";

export function enrichedProfileView(
  profile: SyntheticExternalProfile,
  signals: ExternalSignal[]
): EnrichedProfileView {
  const interest = signals.find((signal) => signal.family === "EXTERNAL_INTEREST");
  const lifeEvent = signals.find((signal) => signal.family === "LIFE_EVENT");
  const obligation = signals.find((signal) => signal.family === "AUTHORIZED_FINANCIAL");
  const preference = signals.find((signal) => signal.family === "DECLARED_PREFERENCE");
  const familyCount = new Set(signals.map((signal) => signal.family)).size;

  return {
    ...profile.snapshot,
    externalInterest: interest?.value,
    lifeEvent: lifeEvent?.value,
    authorizedObligation: obligation?.value,
    preferredChannel: preference
      ? ENRICHMENT_CHANNEL_LABELS[profile.raw.preference?.channel ?? "IN_APP"]
      : undefined,
    activeSignalFamilies: familyCount,
  };
}
