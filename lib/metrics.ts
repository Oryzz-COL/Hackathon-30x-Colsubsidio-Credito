import { PRODUCTS } from "@/config/products";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import type { Profile } from "@/lib/types";

export function deriveMetrics(profiles: Profile[]) {
  /* Un solo cálculo por perfil: con un lote de 2.000 filas, repetirlo tres
     veces son 48.000 evaluaciones y el panel se siente pesado sin motivo. */
  const byProfile = profiles.map((profile) => calculateAllAffinities(profile));
  const top = byProfile.map((items) => items[0]!);
  const withSource = profiles.flatMap((p) => p.evidence).filter((e) => e.sourceReference).length;
  const totalPoints = profiles.flatMap((p) => p.evidence).length;
  return {
    profiles: profiles.length,
    consented: profiles.filter((p) => p.consent).length,
    reviews: top.filter((result) => result.requiresHumanReview).length,
    sourced: Math.round((withSource / Math.max(totalPoints, 1)) * 100),
    coverage: Math.round(profiles.reduce((sum, p) => sum + Math.min(p.evidence.length / 4, 1), 0) / profiles.length * 100),
    explainable: Math.round(top.filter((r) => r.positiveSignals.length).length / profiles.length * 100),
    sufficient: Math.round(top.filter((r) => r.confidence >= 60).length / profiles.length * 100),
    distribution: PRODUCTS.map((product) => ({ name: product.shortName, value: top.filter((r) => r.productId === product.id).length })),
    confidence: [
      { name: "Alta", value: top.filter((r) => r.confidence >= 75).length },
      { name: "Media", value: top.filter((r) => r.confidence >= 50 && r.confidence < 75).length },
      { name: "Por validar", value: top.filter((r) => r.confidence < 50).length },
    ],
  };
}
