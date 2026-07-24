import { PRODUCTS } from "@/config/products";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import type { Profile } from "@/lib/types";

export function deriveMetrics(profiles: Profile[]) {
  const results = profiles.flatMap(calculateAllAffinities);
  const top = profiles.map((profile) => calculateAllAffinities(profile)[0]!);
  const withSource = profiles.flatMap((p) => p.evidence).filter((e) => e.sourceReference).length;
  const totalPoints = profiles.flatMap((p) => p.evidence).length;
  return {
    profiles: profiles.length,
    consented: profiles.filter((p) => p.consent).length,
    reviews: profiles.filter((p) => calculateAllAffinities(p)[0]!.requiresHumanReview).length,
    sourced: Math.round((withSource / Math.max(totalPoints, 1)) * 100),
    coverage: Math.round(profiles.reduce((sum, p) => sum + Math.min(p.evidence.length / 4, 1), 0) / profiles.length * 100),
    explainable: Math.round(top.filter((r) => r.positiveSignals.length).length / profiles.length * 100),
    sufficient: Math.round(top.filter((r) => r.confidence >= 60).length / profiles.length * 100),
    distribution: PRODUCTS.map((product) => ({ name: product.shortName, value: top.filter((r) => r.productId === product.id).length })),
    confidence: [
      { name: "Alta", value: results.filter((r) => r.confidence >= 75).length },
      { name: "Media", value: results.filter((r) => r.confidence >= 50 && r.confidence < 75).length },
      { name: "Por validar", value: results.filter((r) => r.confidence < 50).length },
    ],
  };
}
