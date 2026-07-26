import {
  EXTERNAL_PROFILE_BY_DOCUMENT,
} from "@/data/external-profiles";
import {
  collectConnectorSignals,
  ENRICHMENT_CONNECTOR_VERSION,
} from "@/lib/connectors/enrichment-registry";
import {
  selectDelivery,
} from "@/lib/enrichment/channel";
import {
  conditionFor,
  nextStepFor,
} from "@/lib/enrichment/conditions";
import {
  explainRecommendation,
  explainTiming,
} from "@/lib/enrichment/explanation";
import {
  applySignalPolicy,
  partitionSignals,
} from "@/lib/enrichment/policy";
import {
  enrichedProfileView,
} from "@/lib/enrichment/profile-view";
import {
  hasSufficientDiversity,
  recommendationBase,
  scoreProducts,
  type ProductSignalScore,
} from "@/lib/enrichment/scoring";
import type {
  EnrichmentRecommendation,
  EnrichmentRequest,
  EnrichmentResult,
  ExternalSignal,
  SyntheticExternalProfile,
} from "@/lib/enrichment/types";
import { maskDocument } from "@/lib/privacy";

export const ENRICHMENT_DISCLAIMER =
  "Demostración con datos sintéticos. La recomendación mide afinidad y oportunidad; no consulta burós, no aprueba crédito y exige revisión humana.";

export function normalizeDocument(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

function buildRecommendation(
  score: ProductSignalScore,
  profile: SyntheticExternalProfile,
  signals: ExternalSignal[],
  request: EnrichmentRequest
): EnrichmentRecommendation {
  const base = recommendationBase(score);
  const relevantSignals = signals.filter((signal) =>
    signal.productIds.includes(score.productId)
    || signal.family === "DECLARED_PREFERENCE"
  );
  const delivery = selectDelivery(profile.raw, request.consent);

  return {
    ...base,
    reason: explainRecommendation(base.productName, profile.snapshot, base.contributions),
    whyNow: explainTiming(relevantSignals),
    ...delivery,
    conditionLabel: conditionFor(base.productId, profile.snapshot),
    nextStep: nextStepFor(base.productId),
    requiresHumanReview: true,
  };
}

export function runEnrichment(request: EnrichmentRequest): EnrichmentResult {
  const documentNumber = normalizeDocument(request.documentNumber);
  const now = request.now ? new Date(request.now) : new Date();
  const generatedAt = now.toISOString();
  const lookupId = crypto.randomUUID();
  const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get(documentNumber);

  if (!profile) {
    return {
      status: "NOT_FOUND",
      documentMasked: maskDocument(documentNumber),
      lookupId,
      eligibleSignals: [],
      excludedSignals: [],
      alternatives: [],
      generatedAt,
      connectorVersion: ENRICHMENT_CONNECTOR_VERSION,
      disclaimer: ENRICHMENT_DISCLAIMER,
    };
  }

  const collected = collectConnectorSignals({
    profile,
    consent: request.consent,
    now,
  });
  const governed = applySignalPolicy(collected, request.consent, now);
  const { eligibleSignals, excludedSignals } = partitionSignals(governed);
  const scores = scoreProducts(eligibleSignals);
  const sufficient = scores.filter(hasSufficientDiversity);
  const recommendations = sufficient.map((score) =>
    buildRecommendation(score, profile, eligibleSignals, request)
  );

  return {
    status: "ENRICHED",
    documentMasked: maskDocument(documentNumber),
    lookupId,
    before: profile.snapshot,
    after: enrichedProfileView(profile, eligibleSignals),
    eligibleSignals,
    excludedSignals,
    recommendation: recommendations[0],
    alternatives: recommendations.slice(1, 3),
    generatedAt,
    connectorVersion: ENRICHMENT_CONNECTOR_VERSION,
    disclaimer: ENRICHMENT_DISCLAIMER,
  };
}
