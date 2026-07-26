import { z } from "zod";
import { CONSENT_NOTICE_VERSION } from "@/lib/personalization";
import {
  deriveChannel, deriveTimeBand, deriveTiming, parseDeclaredGender, productsForNeeds,
} from "@/lib/batch/derive";
import { triggerForNeed } from "@/lib/exogenous/calendar";
import type { ConsentRecord, Evidence, Profile } from "@/lib/types";

/** Vacío, "-" o "n/a" es lo mismo que no traer la columna. */
const optionalText = z
  .string()
  .max(160)
  .optional()
  .transform((value) => {
    const clean = value?.trim() ?? "";
    return clean && !/^(-|n\/a|na|null)$/i.test(clean) ? clean : undefined;
  });

/**
 * Esquema compartido de una fila de carga masiva.
 * Lo usan el cliente (validación previa y offline) y la API (validación de servidor).
 *
 * Las siete primeras columnas son las del reto y siguen siendo obligatorias. El
 * resto es opcional a propósito: un archivo de 2.000 cédulas casi nunca las
 * trae, y cuando faltan el perfil no se queda en blanco —se derivan con una
 * razón escrita, en `lib/batch/derive.ts`—. Aceptarlas permite que quien sí
 * tenga el dato lo use en vez de conformarse con nuestra deducción.
 */
export const batchRowSchema = z.object({
  tipo_documento: z.enum(["CC", "CE", "PPT"]),
  documento: z.string().regex(/^[A-Za-z0-9]{5,20}$/, "Documento inválido (5–20 caracteres alfanuméricos)"),
  nombre: z.string().min(3, "Nombre demasiado corto").max(120),
  ciudad: z.string().min(2, "Ciudad requerida").max(80),
  categoria: z.enum(["A", "B", "C", "D"]).default("A"),
  necesidades: z.string().min(2, "Debe declarar al menos una necesidad"),
  consentimiento: z.enum(["SI", "NO"]),
  genero: optionalText,
  canal: optionalText,
  correo: optionalText,
  telefono: optionalText,
  ocupacion: optionalText,
  ingreso: optionalText,
  contrato: optionalText,
  antiguedad: optionalText,
});

export type BatchRow = z.infer<typeof batchRowSchema>;

export interface RowValidation {
  row: number; // número de fila en el archivo (encabezado = 1)
  status: "VALID" | "INVALID";
  errors: string[];
  data?: BatchRow;
}

export function validateRows(rows: unknown[]): RowValidation[] {
  return rows.map((raw, index) => {
    const parsed = batchRowSchema.safeParse(raw);
    return parsed.success
      ? { row: index + 2, status: "VALID" as const, errors: [], data: parsed.data }
      : {
          row: index + 2,
          status: "INVALID" as const,
          errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        };
  });
}

/** Evidencia trazable a partir de necesidades declaradas voluntariamente. */
export function declaredEvidence(
  needs: string[],
  sourceName: string,
  sourceReference: string,
  consent: boolean
): Evidence[] {
  const now = new Date().toISOString();
  return needs.slice(0, 3).map((need, i) => ({
    id: crypto.randomUUID(),
    label: i === 0 ? "Necesidad declarada" : "Necesidad adicional declarada",
    value: need,
    normalizedValue: need.toUpperCase(),
    sourceType: "USER_DECLARED",
    sourceName,
    sourceReference,
    capturedAt: now,
    lastVerifiedAt: now,
    confidence: 0.85,
    consentScope: consent ? "PERFILAMIENTO_COMERCIAL" : "NO_AUTORIZADO",
    dataNature: "DECLARED",
    evidenceStatus: "VIGENTE",
  }));
}

/** Etiquetas con las que el CSV de salida vuelve a encontrar cada derivación. */
export const DERIVED_CHANNEL_LABEL = "Canal derivado";
export const DERIVED_TIMING_LABEL = "Momento derivado";

function derivedEvidence(label: string, value: string, reason: string, reference: string): Evidence {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    label,
    value,
    normalizedValue: value.toUpperCase(),
    sourceType: "DERIVED",
    sourceName: "Motor de derivación del lote",
    sourceReference: reference,
    capturedAt: now,
    lastVerifiedAt: now,
    /* Una deducción nuestra no puede valer lo mismo que un dato declarado por la
       persona: entra con menos confianza y así llega al índice. */
    confidence: 0.6,
    consentScope: "ORIENTACION",
    dataNature: "DERIVED",
    evidenceStatus: "VIGENTE",
    notes: reason,
  };
}

/**
 * Convierte una fila válida en un perfil con evidencia trazable.
 *
 * El archivo del reto trae siete columnas. Un perfil que solo copie esas siete
 * produce la misma oferta para todo el lote, así que aquí se derivan canal,
 * momento y urgencia a partir de la necesidad declarada y de los datos de
 * contacto que el archivo sí aporte. Cada derivación deja su razón escrita en
 * la evidencia, marcada `DERIVED` y con menos confianza que un dato declarado.
 *
 * El género es la excepción deliberada: si la columna no viene, no se deduce.
 */
export function rowToProfile(data: BatchRow, fileName: string): Profile {
  const now = new Date().toISOString();
  const needs = data.necesidades
    .split(/[|;]/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
  const consent = data.consentimiento === "SI";
  const reference = `LOTE-${fileName}`;

  const channel = deriveChannel(needs, {
    declaredChannel: data.canal,
    email: data.correo,
    phone: data.telefono,
  });
  /* El calendario de la ciudad manda sobre la deducción genérica: un predial
     que cierra en tres semanas es un momento concreto, no una familia de
     necesidad. */
  const timing = deriveTiming(needs, triggerForNeed(data.ciudad, productsForNeeds(needs)));
  const gender = parseDeclaredGender(data.genero);
  const tenureMonths = Number(data.antiguedad);

  const consents: ConsentRecord[] = consent
    ? [
        {
          id: crypto.randomUUID(), purpose: "GUIDANCE",
          scope: "Orientación de afinidad sobre datos del archivo",
          noticeVersion: CONSENT_NOTICE_VERSION, grantedAt: now,
          source: "ADVISOR_FORM", status: "GRANTED", channels: [], synthetic: true,
        },
        {
          id: crypto.randomUUID(), purpose: "COMMERCIAL_CONTACT",
          scope: `Contacto por ${channel.value} según la autorización del archivo`,
          noticeVersion: CONSENT_NOTICE_VERSION, grantedAt: now,
          source: "ADVISOR_FORM", status: "GRANTED", channels: [channel.value], synthetic: true,
        },
      ]
    : [];

  return {
    id: crypto.randomUUID(),
    fullName: data.nombre,
    documentType: data.tipo_documento,
    documentNumber: data.documento,
    city: data.ciudad,
    email: data.correo ?? "",
    phone: data.telefono ?? "",
    affiliation: "Pendiente",
    category: data.categoria,
    gender,
    occupation: data.ocupacion,
    incomeRange: data.ingreso,
    contractType: data.contrato,
    tenureMonths: Number.isFinite(tenureMonths) && data.antiguedad ? tenureMonths : undefined,
    declaredGoal: needs[0],
    lifeEvent: `Necesidad declarada: ${needs[0]}`,
    goalHorizon: timing.goalHorizon,
    urgency: timing.urgency,
    serviceUsage: [needs[0]!],
    digitalInteractions: [],
    declaredInterests: needs.slice(0, 3),
    needs,
    declaredObligations: needs.some((n) => /cartera|consolidar|obligaci/.test(n)),
    consent,
    consentPurpose: consent ? "Perfilamiento de afinidad y contacto asesorado" : "No autorizada",
    consentDate: consent ? now : undefined,
    synthetic: true,
    origin: "BATCH_IMPORT",
    preferences: {
      interestedProductIds: [],
      horizon: timing.horizon,
      preferredChannel: channel.value,
      preferredTimeBand: deriveTimeBand(channel.value),
      maxContactFrequency: "ONCE_MONTH",
      wantsAdvisor: false,
    },
    consents,
    evidence: [
      ...declaredEvidence(needs, `Archivo ${fileName}`, reference, consent),
      derivedEvidence(DERIVED_CHANNEL_LABEL, channel.value, channel.reason, reference),
      derivedEvidence(DERIVED_TIMING_LABEL, timing.timing, timing.reason, reference),
    ],
  };
}
