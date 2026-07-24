import type { Evidence, Profile } from "@/lib/types";

export interface DataConnector {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  legalBasis: string;
  consentRequired: boolean;
  fieldsProvided: string[];
  rateLimit: string;
  healthStatus: "OPERATIVO" | "SIMULADO" | "DESHABILITADO";
  fetch(input: unknown): Promise<unknown>;
  validate(input: unknown): boolean;
  normalize(input: unknown): Partial<Profile>;
  getEvidence(input: unknown): Evidence[];
}

export const CONNECTORS = [
  { id: "form", name: "Formulario del afiliado", description: "Datos aportados voluntariamente", enabled: true, legalBasis: "Consentimiento verificable", consentRequired: true, fieldsProvided: ["Necesidades","Finalidad","Contacto"], rateLimit: "60/min", healthStatus: "OPERATIVO" },
  { id: "files", name: "CSV / XLSX", description: "Archivos aportados al workspace", enabled: true, legalBasis: "Archivo autorizado", consentRequired: true, fieldsProvided: ["Perfiles","Consentimientos"], rateLimit: "2.000 filas/lote", healthStatus: "OPERATIVO" },
  { id: "synthetic", name: "Base sintética", description: "Perfiles ficticios para la demo", enabled: true, legalBasis: "Datos sintéticos", consentRequired: false, fieldsProvided: ["36 perfiles"], rateLimit: "Sin límite", healthStatus: "SIMULADO" },
  { id: "internal", name: "Datos internos simulados", description: "Adaptador de afiliación para demo", enabled: true, legalBasis: "Operación simulada", consentRequired: false, fieldsProvided: ["Estado de afiliación"], rateLimit: "Demo", healthStatus: "SIMULADO" },
  { id: "identity", name: "Proveedor de identidad autorizado", description: "Integración futura sujeta a contrato", enabled: false, legalBasis: "Por definir", consentRequired: true, fieldsProvided: [], rateLimit: "N/A", healthStatus: "DESHABILITADO" },
  { id: "bureau", name: "Buró de crédito autorizado", description: "Solo con proveedor habilitado y autorización", enabled: false, legalBasis: "Habeas data financiero", consentRequired: true, fieldsProvided: [], rateLimit: "N/A", healthStatus: "DESHABILITADO" },
  { id: "open-banking", name: "Open Banking", description: "Consentimiento expreso y proveedor regulado", enabled: false, legalBasis: "Por definir", consentRequired: true, fieldsProvided: [], rateLimit: "N/A", healthStatus: "DESHABILITADO" },
] as const;
