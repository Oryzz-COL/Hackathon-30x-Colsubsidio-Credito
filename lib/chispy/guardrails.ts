/**
 * Presupuesto y límites del proveedor de lenguaje.
 *
 * Hay límites por IP y diarios, además de un interruptor manual. Superar un
 * límite degrada al motor local en vez de convertir el agotamiento de cuota en
 * un error visible.
 *
 * El estado vive en memoria del proceso. En serverless eso significa que cada
 * instancia lleva su propia cuenta, así que el techo real es el configurado por
 * el número de instancias vivas. Un despliegue productivo requiere un contador
 * distribuido.
 */

const PER_IP_LIMIT = 12;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const DAILY_LIMIT = Number(process.env.CHISPY_LIMITE_DIARIO ?? 250);

export const MAX_QUERY_LENGTH = 500;

type Bucket = { count: number; resetAt: number };

const perIp = new Map<string, Bucket>();
let daily: Bucket = { count: 0, resetAt: Date.now() + 86_400_000 };

export type BudgetVerdict =
  | { allowed: true }
  | { allowed: false; reason: "APAGADO" | "LIMITE_IP" | "LIMITE_DIARIO" | "SIN_PROVEEDOR" };

/** ¿Hay un proveedor de modelo configurado y encendido? */
export function providerAvailable(): boolean {
  if (process.env.CHISPY_ENABLED === "false") return false;
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/**
 * Decide si esta consulta puede gastar tokens. Consume cupo solo cuando la
 * respuesta es afirmativa: quien cae en el fallback local no gasta presupuesto
 * y por tanto tampoco debe descontarlo.
 */
export function checkBudget(ip: string): BudgetVerdict {
  if (process.env.CHISPY_ENABLED === "false") return { allowed: false, reason: "APAGADO" };
  if (!providerAvailable()) return { allowed: false, reason: "SIN_PROVEEDOR" };

  const now = Date.now();

  if (daily.resetAt <= now) daily = { count: 0, resetAt: now + 86_400_000 };
  if (daily.count >= DAILY_LIMIT) return { allowed: false, reason: "LIMITE_DIARIO" };

  const bucket = perIp.get(ip);
  const current = bucket && bucket.resetAt > now ? bucket : { count: 0, resetAt: now + PER_IP_WINDOW_MS };
  if (current.count >= PER_IP_LIMIT) return { allowed: false, reason: "LIMITE_IP" };

  current.count += 1;
  perIp.set(ip, current);
  daily = { ...daily, count: daily.count + 1 };

  /* Higiene: la tabla de IPs no puede crecer sin fin en un proceso largo. */
  if (perIp.size > 5_000) {
    for (const [key, value] of perIp) if (value.resetAt <= now) perIp.delete(key);
  }

  return { allowed: true };
}

/** Nota que se muestra bajo la respuesta cuando se sirvió sin modelo. */
export function budgetNotice(reason: BudgetVerdict extends { allowed: false } ? never : string): string {
  switch (reason) {
    case "LIMITE_IP":
      return "Alcanzaste el límite de consultas con modelo para esta sesión. Chispy sigue respondiendo con su motor local, que consulta la misma base de conocimiento.";
    case "LIMITE_DIARIO":
      return "El presupuesto de modelo asignado a la demostración de hoy se agotó. Chispy responde con su motor local sobre la misma base de conocimiento.";
    case "APAGADO":
      return "El modelo está desactivado en este despliegue. Chispy responde con su motor local.";
    default:
      return "Chispy respondió con su motor local, sin enviar nada a un servicio externo.";
  }
}

/** Estado para la barra de la interfaz, sin exponer claves ni contadores exactos. */
export function budgetStatus() {
  return {
    provider: providerAvailable(),
    remainingToday: Math.max(0, DAILY_LIMIT - daily.count),
    dailyLimit: DAILY_LIMIT,
  };
}
