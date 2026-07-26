import { PRODUCTS } from "@/config/products";
import { SIGNAL_FAMILY_LABELS } from "@/lib/enrichment/signal";
import {
  ENRICHMENT_RULE_VERSION,
  MINIMUM_SIGNAL_FAMILIES,
  SIGNAL_FAMILY_WEIGHTS,
} from "@/lib/enrichment/weights";
import type {
  EnrichmentRecommendation,
  ExternalSignal,
  SignalContributionReceipt,
} from "@/lib/enrichment/types";
import type { ProductId } from "@/lib/types";

export interface ProductSignalScore {
  productId: ProductId;
  score: number;
  signalFamilies: number;
  contributions: SignalContributionReceipt[];
  ruleVersion: string;
}

function contributionForFamily(
  productId: ProductId,
  signals: ExternalSignal[]
): SignalContributionReceipt[] {
  const byFamily = new Map<ExternalSignal["family"], ExternalSignal[]>();
  for (const signal of signals) {
    if (!signal.productIds.includes(productId)) continue;
    const familySignals = byFamily.get(signal.family) ?? [];
    familySignals.push(signal);
    byFamily.set(signal.family, familySignals);
  }

  return [...byFamily.entries()].flatMap(([family, familySignals]) => {
    const weight = SIGNAL_FAMILY_WEIGHTS[family];
    if (weight === 0) return [];
    const best = [...familySignals].sort((a, b) => b.confidence - a.confidence)[0]!;
    return [{
      family,
      familyLabel: SIGNAL_FAMILY_LABELS[family],
      points: weight,
      signalId: best.id,
      signalLabel: best.value,
      confidence: best.confidence,
      connectorId: best.connectorId,
    }];
  });
}

export function scoreProducts(signals: ExternalSignal[]): ProductSignalScore[] {
  return PRODUCTS
    .filter((product) => product.status === "DOCUMENTADO_BRIEF")
    .map((product) => {
      const contributions = contributionForFamily(product.id, signals);
      return {
        productId: product.id,
        score: Math.min(100, contributions.reduce((sum, contribution) => sum + contribution.points, 0)),
        signalFamilies: contributions.length,
        contributions: contributions.sort((a, b) => b.points - a.points),
        ruleVersion: ENRICHMENT_RULE_VERSION,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) =>
      b.score - a.score
      || b.signalFamilies - a.signalFamilies
      || a.productId.localeCompare(b.productId)
    );
}

export function hasSufficientDiversity(
  result: Pick<ProductSignalScore, "signalFamilies">
): boolean {
  return result.signalFamilies >= MINIMUM_SIGNAL_FAMILIES;
}

export type RecommendationBase = Omit<
  EnrichmentRecommendation,
  "reason" | "whyNow" | "channel" | "channelLabel" | "timeBand" | "timeBandLabel" | "conditionLabel" | "nextStep" | "requiresHumanReview"
>;

export function recommendationBase(result: ProductSignalScore): RecommendationBase {
  const product = PRODUCTS.find((item) => item.id === result.productId)!;
  return {
    productId: result.productId,
    productName: product.name,
    score: result.score,
    signalFamilies: result.signalFamilies,
    contributions: result.contributions,
    ruleVersion: result.ruleVersion,
  };
}
