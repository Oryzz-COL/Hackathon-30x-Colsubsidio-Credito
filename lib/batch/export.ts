/**
 * El archivo que se lleva quien cargó el lote.
 *
 * Antes la exportación devolvía `fila, estado, observaciones`: servía para
 * corregir el CSV de entrada y para nada más. Quien procesa 2.000 cédulas no
 * quiere saber que la fila 417 estaba bien escrita; quiere saber qué ofrecerle
 * a esa persona, cuándo, por dónde y con qué argumento.
 *
 * Estas columnas son el contrato mínimo de salida del reto: producto, momento,
 * canal, tres señales, explicación, confianza y la versión de regla que produjo
 * el resultado. Con eso, la recomendación se puede auditar meses después sin
 * volver a ejecutar nada.
 *
 * El documento sale enmascarado. Un CSV se reenvía por correo y termina en el
 * escritorio de cualquiera; la cédula completa no tiene por qué viajar ahí.
 */

import { getProduct } from "@/config/products";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { buildPersonalizedOffer, evaluateContactPolicy } from "@/lib/personalization";
import { maskDocument, safeCsvCell } from "@/lib/privacy";
import { DERIVED_CHANNEL_LABEL, DERIVED_TIMING_LABEL, type RowValidation } from "@/lib/validation/batch-row";
import type { Profile } from "@/lib/types";

const COLUMNS = [
  "fila", "estado", "observaciones",
  "documento", "nombre", "ciudad", "categoria",
  "necesidad_detectada", "producto_recomendado", "nivel_correspondencia", "confianza",
  "momento_recomendado", "por_que_ese_momento",
  "canal_recomendado", "por_que_ese_canal", "contacto_permitido",
  "senal_1", "senal_2", "senal_3",
  "explicacion_afiliado", "que_falta_confirmar",
  "requiere_revision_humana", "version_regla", "calculado_en", "dato_sintetico",
] as const;

const note = (profile: Profile, label: string) =>
  profile.evidence.find((item) => item.label === label)?.notes ?? "";

/** Una fila de salida por perfil, con todo lo que hace falta para defenderla. */
export function profileToOutputRow(profile: Profile, row: number): string[] {
  const top = calculateAllAffinities(profile)[0]!;
  const offer = buildPersonalizedOffer(profile, top);
  const policy = evaluateContactPolicy(profile);
  const [first = "", second = "", third = ""] = top.positiveSignals;

  return [
    String(row), "VALIDA", "",
    maskDocument(profile.documentNumber), profile.fullName, profile.city, profile.category ?? "sin declarar",
    offer.detectedNeed, getProduct(top.productId).name, top.affinityLevel, `${top.confidence}%`,
    offer.timing, note(profile, DERIVED_TIMING_LABEL),
    offer.channelLabel, note(profile, DERIVED_CHANNEL_LABEL), policy.label,
    first, second, third,
    offer.message, top.missingSignals.join(" | "),
    top.requiresHumanReview ? "SI" : "NO", top.ruleVersion, top.calculatedAt, "SI",
  ];
}

/**
 * El CSV completo: primero las filas que produjeron una recomendación, después
 * las que no, con el motivo. Las rechazadas conservan su número de fila del
 * archivo original para poder corregirlas sin adivinar cuál era.
 */
export function buildBatchOutputCsv(profiles: Profile[], validation: RowValidation[]): string {
  const valid = validation.filter((item) => item.status === "VALID");
  const rows = profiles.map((profile, index) =>
    profileToOutputRow(profile, valid[index]?.row ?? index + 2)
  );

  const rejected = validation
    .filter((item) => item.status === "INVALID")
    .map((item) => [
      String(item.row), "ERROR", item.errors.join(" | "),
      ...Array<string>(COLUMNS.length - 3).fill(""),
    ]);

  return [COLUMNS, ...rows, ...rejected]
    .map((line) => line.map(safeCsvCell).join(","))
    .join("\n");
}

/** Prueba de que el lote no produjo la misma oferta 2.000 veces. */
export function summarizeBatchDiversity(profiles: Profile[]) {
  const tops = profiles.map((profile) => calculateAllAffinities(profile)[0]!);
  const offers = profiles.map((profile, index) => buildPersonalizedOffer(profile, tops[index]!));
  return {
    products: new Set(tops.map((item) => item.productId)).size,
    channels: new Set(offers.map((item) => item.channel)).size,
    timings: new Set(offers.map((item) => item.timing)).size,
  };
}
