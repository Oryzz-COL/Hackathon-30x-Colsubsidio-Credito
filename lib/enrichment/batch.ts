import { runEnrichment } from "@/lib/enrichment/engine";
import type {
  EnrichmentConsent,
  EnrichmentResult,
} from "@/lib/enrichment/types";

export const ENRICHMENT_BATCH_LIMIT = 2_000;

export function parseDocumentBatch(input: string): string[] {
  const tokens = input
    .replace(/\r/g, "\n")
    .split(/[\n,;\t]+/)
    .map((item) => item.replace(/\D/g, ""))
    .filter((item) => item.length >= 6 && item.length <= 12);
  return [...new Set(tokens)].slice(0, ENRICHMENT_BATCH_LIMIT);
}

export function enrichDocumentBatch(
  documents: string[],
  consent: EnrichmentConsent,
  now?: string
): EnrichmentResult[] {
  return documents.slice(0, ENRICHMENT_BATCH_LIMIT).map((documentNumber) =>
    runEnrichment({ documentNumber, consent, now })
  );
}

export function summarizeEnrichmentBatch(results: EnrichmentResult[]) {
  const enriched = results.filter((result) => result.status === "ENRICHED");
  return {
    total: results.length,
    enriched: enriched.length,
    notFound: results.length - enriched.length,
    products: new Set(enriched.flatMap((result) =>
      result.recommendation ? [result.recommendation.productId] : []
    )).size,
    channels: new Set(enriched.flatMap((result) =>
      result.recommendation ? [result.recommendation.channel] : []
    )).size,
    averageFamilies: enriched.length
      ? enriched.reduce((sum, result) =>
          sum + (result.recommendation?.signalFamilies ?? 0), 0
        ) / enriched.length
      : 0,
  };
}
