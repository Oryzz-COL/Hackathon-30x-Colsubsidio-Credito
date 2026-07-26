import type {
  EnrichmentConsent,
  EnrichmentRawData,
} from "@/lib/enrichment/types";
import type { ContactChannel, ContactTimeBand } from "@/lib/types";

export const ENRICHMENT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  IN_APP: "Portal Colsubsidio",
  EMAIL: "Correo electrónico",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  CALL: "Llamada de una asesora",
};

export const ENRICHMENT_TIME_LABELS: Record<ContactTimeBand, string> = {
  WEEKDAY_MORNING: "lunes a viernes en la mañana",
  WEEKDAY_AFTERNOON: "lunes a viernes en la tarde",
  SATURDAY: "sábado de 8:00 a. m. a 3:00 p. m.",
};

export function selectDelivery(
  raw: EnrichmentRawData,
  consent: EnrichmentConsent
): {
  channel: ContactChannel;
  channelLabel: string;
  timeBand: ContactTimeBand;
  timeBandLabel: string;
} {
  const authorized = consent.commercialContact && raw.preference;
  const channel = authorized ? raw.preference!.channel : "IN_APP";
  const timeBand = authorized ? raw.preference!.timeBand : "WEEKDAY_MORNING";
  return {
    channel,
    channelLabel: ENRICHMENT_CHANNEL_LABELS[channel],
    timeBand,
    timeBandLabel: ENRICHMENT_TIME_LABELS[timeBand],
  };
}
