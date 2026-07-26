/**
 * Lo único que el servidor recuerda.
 *
 * Antes esto era un arreglo mutable y global: cualquiera que llenara el
 * formulario público dejaba su nombre, su cédula y su teléfono en la memoria
 * del proceso, y el siguiente visitante los veía en la bandeja. En un
 * despliegue público eso convierte una demostración sobre habeas data en el
 * ejemplo de lo que no se debe hacer.
 *
 * Ahora el catálogo de perfiles es de solo lectura: los 36 casos sintéticos y
 * nada más. Lo que una persona declara en el recorrido no se guarda aquí —se
 * calcula, se responde y se queda en su navegador (`lib/demo-case.ts`)—, así
 * que dos visitantes simultáneos nunca se ven los datos.
 *
 * Queda el registro de auditoría, que es la parte que sí conviene compartir:
 * son eventos sin PII y demuestran que cada cálculo deja rastro.
 */

import { PROFILES } from "@/data/profiles";
import type { AuditEvent, Profile } from "@/lib/types";

/* Congelado en el arranque: nadie muta el catálogo de demostración. */
const profiles: readonly Profile[] = Object.freeze(structuredClone(PROFILES));

let audit: AuditEvent[] = [
  { id: "aud-1", action: "DEMO_LOGIN", actor: "Asesora demo", detail: "Inicio de sesión demo", createdAt: "2026-07-23T13:45:00.000Z" },
  { id: "aud-2", action: "BATCH_IMPORT", actor: "Sistema", detail: "Lote sintético: 36 filas procesadas", createdAt: "2026-07-23T13:48:00.000Z" },
  { id: "aud-3", action: "AFFINITY_CALCULATED", actor: "Motor v2026.07.1", detail: "Índices recalculados sin PII", createdAt: "2026-07-23T13:49:00.000Z" },
];

/** Techo del registro: una demo larga no debe crecer sin fin en memoria. */
const AUDIT_LIMIT = 200;

export const store = {
  list: (): Profile[] => structuredClone(profiles) as Profile[],
  get: (id: string) => profiles.find((p) => p.id === id),
  audit: () => audit,
  log: (event: Omit<AuditEvent, "id" | "createdAt">) => {
    audit = [{ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...audit].slice(0, AUDIT_LIMIT);
  },
};
