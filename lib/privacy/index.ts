const BLOCKED = ["religión", "raza", "etnia", "embarazo", "diagnóstico", "orientación sexual", "afiliación política"];

export const maskDocument = (value: string) => value.length < 4 ? "••••" : `${value.slice(0, 2)}••••${value.slice(-2)}`;
export const maskEmail = (value: string) => {
  const [name = "", domain = ""] = value.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
};
export const maskPhone = (value: string) => `••• ••• ${value.slice(-4)}`;
export const redactText = (value: string) =>
  value.replace(/\b\d{7,12}\b/g, "[DOCUMENTO OCULTO]").replace(/[\w.+-]+@[\w.-]+\.\w+/g, "[CORREO OCULTO]");
export const detectSensitive = (value: string) => BLOCKED.filter((term) => value.toLowerCase().includes(term));
export const safeCsvCell = (value: unknown) => {
  const text = String(value ?? "").replaceAll('"', '""');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe}"`;
};
