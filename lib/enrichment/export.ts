import { safeCsvCell } from "@/lib/privacy";
import type { EnrichmentResult } from "@/lib/enrichment/types";

const HEADERS = [
  "documento_enmascarado",
  "estado",
  "producto",
  "condicion",
  "canal",
  "momento",
  "familias_senal",
  "senal_1",
  "senal_2",
  "senal_3",
  "explicacion",
  "regla",
  "revision_humana",
];

export function buildEnrichmentCsv(results: EnrichmentResult[]): string {
  const rows = results.map((result) => {
    const recommendation = result.recommendation;
    const contributions = recommendation?.contributions ?? [];
    return [
      result.documentMasked,
      result.status,
      recommendation?.productName ?? "",
      recommendation?.conditionLabel ?? "",
      recommendation?.channelLabel ?? "",
      recommendation?.whyNow ?? "",
      recommendation?.signalFamilies ?? 0,
      contributions[0]?.signalLabel ?? "",
      contributions[1]?.signalLabel ?? "",
      contributions[2]?.signalLabel ?? "",
      recommendation?.reason ?? "No se encontraron datos sintéticos para esta cédula.",
      recommendation?.ruleVersion ?? "",
      recommendation ? "SI" : "",
    ].map(safeCsvCell).join(",");
  });

  return [HEADERS.map(safeCsvCell).join(","), ...rows].join("\n");
}
