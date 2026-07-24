import { z } from "zod";
import type { Evidence, Profile } from "@/lib/types";

/**
 * Esquema compartido de una fila de carga masiva.
 * Lo usan el cliente (validación previa y offline) y la API (validación de servidor).
 */
export const batchRowSchema = z.object({
  tipo_documento: z.enum(["CC", "CE", "PPT"]),
  documento: z.string().regex(/^[A-Za-z0-9]{5,20}$/, "Documento inválido (5–20 caracteres alfanuméricos)"),
  nombre: z.string().min(3, "Nombre demasiado corto").max(120),
  ciudad: z.string().min(2, "Ciudad requerida").max(80),
  necesidades: z.string().min(2, "Debe declarar al menos una necesidad"),
  consentimiento: z.enum(["SI", "NO"]),
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

/** Convierte una fila válida en un perfil sintético con evidencia trazable. */
export function rowToProfile(data: BatchRow, fileName: string): Profile {
  const now = new Date().toISOString();
  const needs = data.necesidades
    .split(/[|;]/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
  const consent = data.consentimiento === "SI";
  const evidence = declaredEvidence(needs, `Archivo ${fileName}`, `LOTE-${fileName}`, consent);
  return {
    id: crypto.randomUUID(),
    fullName: data.nombre,
    documentType: data.tipo_documento,
    documentNumber: data.documento,
    city: data.ciudad,
    email: "",
    phone: "",
    affiliation: "Pendiente",
    needs,
    declaredObligations: needs.some((n) => /cartera|consolidar|obligaci/.test(n)),
    consent,
    consentPurpose: consent ? "Perfilamiento de afinidad y contacto asesorado" : "No autorizada",
    consentDate: consent ? now : undefined,
    synthetic: true,
    evidence,
  };
}
