import { z } from "zod";
import { detectSensitive } from "@/lib/privacy";
import type { DataNature, Evidence, SourceType } from "@/lib/types";

export const rawDataPointSchema = z.object({
  field: z.string().min(1).max(80),
  value: z.union([z.string(), z.number(), z.boolean()]),
  sourceType: z.enum(["USER_DECLARED","COLSUBSIDIO_INTERNAL","AUTHORIZED_PROVIDER","PUBLIC_OFFICIAL","SYNTHETIC_DEMO","DERIVED","LLM_SUMMARY"]),
  sourceName: z.string().min(1), sourceReference: z.string().min(1),
  capturedAt: z.string().datetime(), lastVerifiedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1), consentScope: z.string(),
  dataNature: z.enum(["OBSERVED","DECLARED","VERIFIED","DERIVED","INFERRED","UNKNOWN"]),
});

export function normalizeDataPoint(input: unknown): Evidence {
  const point = rawDataPointSchema.parse(input);
  const text = String(point.value).trim();
  const sensitive = detectSensitive(text);
  const stale = Date.now() - new Date(point.lastVerifiedAt).getTime() > 365 * 24 * 60 * 60 * 1000;
  const llmCannotVerify = point.sourceType === "LLM_SUMMARY" && point.dataNature === "VERIFIED";
  return {
    id: crypto.randomUUID(), label: point.field.replaceAll("_", " "),
    value: sensitive.length ? "[DATO SENSIBLE BLOQUEADO]" : text,
    normalizedValue: sensitive.length ? "" : text.normalize("NFKC").replace(/\s+/g, " ").toUpperCase(),
    sourceType: point.sourceType as SourceType, sourceName: point.sourceName, sourceReference: point.sourceReference,
    capturedAt: point.capturedAt, lastVerifiedAt: point.lastVerifiedAt,
    confidence: sensitive.length ? 0 : point.confidence, consentScope: point.consentScope,
    dataNature: (llmCannotVerify ? "INFERRED" : point.dataNature) as DataNature,
    evidenceStatus: sensitive.length ? "EXCLUIDA" : stale ? "VENCIDA" : "VIGENTE",
    notes: sensitive.length ? `Categoría sensible detectada y excluida: ${sensitive.join(", ")}` : llmCannotVerify ? "Un resumen LLM nunca se eleva a verificado" : undefined,
  };
}
