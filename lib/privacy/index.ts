const BLOCKED = ["religión", "raza", "etnia", "embarazo", "diagnóstico", "orientación sexual", "afiliación política"];

export const maskDocument = (value: string) => value.length < 4 ? "••••" : `${value.slice(0, 2)}••••${value.slice(-2)}`;

/**
 * Cómo se nombra a alguien que no dejó documento.
 *
 * El recorrido público no lo exige, así que la bandeja tiene que saber decirlo
 * sin que parezca un dato perdido: no falta nada, simplemente no se pidió.
 */
export const documentLabel = (value?: string) =>
  value ? maskDocument(value) : "Sin documento declarado";
export const maskEmail = (value: string) => {
  const [name = "", domain = ""] = value.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
};
export const maskPhone = (value: string) => `••• ••• ${value.slice(-4)}`;
export const redactText = (value: string) =>
  value.replace(/\b\d{7,12}\b/g, "[DOCUMENTO OCULTO]").replace(/[\w.+-]+@[\w.-]+\.\w+/g, "[CORREO OCULTO]");
export const detectSensitive = (value: string) => BLOCKED.filter((term) => value.toLowerCase().includes(term));
/**
 * La versión de un perfil que puede salir por la red.
 *
 * El enmascarado vivía solo en los componentes, así que la interfaz mostraba
 * `99••••00` mientras `GET /api/profiles` devolvía la cédula completa a
 * cualquiera que abriera la URL. Un enmascarado que depende de que nadie mire
 * la respuesta no es un control: es una decoración.
 *
 * Las tres funciones de máscara son idempotentes, así que aplicarlas aquí y de
 * nuevo en la pantalla no rompe nada.
 */
export function publicProfile<T extends { documentNumber?: string; email?: string; phone?: string }>(profile: T): T {
  return {
    ...profile,
    documentNumber: profile.documentNumber ? maskDocument(profile.documentNumber) : profile.documentNumber,
    email: profile.email ? maskEmail(profile.email) : profile.email,
    phone: profile.phone ? maskPhone(profile.phone) : profile.phone,
  };
}

export const safeCsvCell = (value: unknown) => {
  const text = String(value ?? "").replaceAll('"', '""');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe}"`;
};
