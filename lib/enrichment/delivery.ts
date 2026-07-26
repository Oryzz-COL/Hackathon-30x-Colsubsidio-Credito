import { composeForChannel, type ChannelPiece } from "@/lib/notificaciones/canales";
import type {
  EnrichmentRecommendation,
  EnrichmentResult,
  SyntheticExternalProfile,
} from "@/lib/enrichment/types";
import { maskEmail, maskPhone } from "@/lib/privacy";

export type EnrichmentDeliveryStatus =
  | "DISPLAYED_IN_PORTAL"
  | "QUEUED_FOR_HUMAN_REVIEW"
  | "SIMULATED_DELIVERY";

export interface EnrichmentDeliveryReceipt {
  id: string;
  status: EnrichmentDeliveryStatus;
  channel: EnrichmentRecommendation["channel"];
  channelLabel: string;
  destinationMasked: string;
  piece: ChannelPiece;
  deliveredAt: string;
  detail: string;
}

export function composeEnrichmentPiece(
  result: EnrichmentResult
): ChannelPiece | undefined {
  const recommendation = result.recommendation;
  const firstName = result.before?.fullName.split(" ")[0];
  if (!recommendation || !firstName) return undefined;
  return composeForChannel({
    channel: recommendation.channel,
    firstName,
    productName: recommendation.productName,
    message: `${recommendation.reason} ${recommendation.conditionLabel} ${recommendation.nextStep}`,
    timeBand: recommendation.timeBand,
  });
}

export function simulateEnrichmentDelivery(
  result: EnrichmentResult,
  profile: SyntheticExternalProfile,
  now = new Date()
): EnrichmentDeliveryReceipt | undefined {
  const recommendation = result.recommendation;
  const piece = composeEnrichmentPiece(result);
  if (!recommendation || !piece) return undefined;

  const status: EnrichmentDeliveryStatus =
    recommendation.channel === "IN_APP"
      ? "DISPLAYED_IN_PORTAL"
      : recommendation.channel === "CALL"
        ? "QUEUED_FOR_HUMAN_REVIEW"
        : "SIMULATED_DELIVERY";

  const destinationMasked =
    recommendation.channel === "EMAIL"
      ? maskEmail(profile.email)
      : recommendation.channel === "IN_APP"
        ? "Portal autenticado"
        : maskPhone(profile.phone);

  return {
    id: crypto.randomUUID(),
    status,
    channel: recommendation.channel,
    channelLabel: recommendation.channelLabel,
    destinationMasked,
    piece,
    deliveredAt: now.toISOString(),
    detail:
      status === "DISPLAYED_IN_PORTAL"
        ? "La oferta quedó disponible dentro del portal; no requiere contacto comercial."
        : status === "QUEUED_FOR_HUMAN_REVIEW"
          ? "El guion quedó en la bandeja de una persona asesora para aprobación."
          : "La pieza se entregó a la bandeja demostrativa del canal elegido.",
  };
}
