/**
 * El caso del afiliado, guardado donde le corresponde: su navegador.
 *
 * El recorrido termina prometiendo que la solicitud llega al portal de la
 * asesora, y esa promesa se rompía en producción. El caso se guardaba en la
 * memoria del proceso de Next.js, y en un despliegue serverless cada petición
 * puede caer en una instancia distinta o encontrarla reciclada: el jurado
 * completaba el recorrido, entraba al portal y su caso no estaba. Lo peor que
 * puede pasarle a una demostración es fallar justo en el paso que la explica.
 *
 * La solución no es una base de datos. Es entender de quién es el dato: lo que
 * una persona declaró en su sesión no tiene por qué vivir en un servidor
 * compartido con desconocidos. Aquí vive en su `localStorage`, el handoff
 * funciona siempre, y de paso desaparece la fuga que permitía a un visitante
 * leer lo que otro acababa de escribir.
 *
 * Reglas del almacén: clave versionada, caducidad corta y un tope de casos. Es
 * PII declarada, no un carrito de compras.
 */

import type { OutboxMessage } from "@/lib/notificaciones";
import type { Profile } from "@/lib/types";

const KEY = "creasy.casos.v1";

/**
 * Un día. Suficiente para que el jurado vuelva al portal después del recorrido
 * y corto para no dejar una cédula en el navegador de un equipo prestado.
 */
export const CASE_TTL_MS = 24 * 60 * 60 * 1000;

/** Nadie necesita más de cinco casos en una demostración. */
const MAX_CASES = 5;

export interface LocalCase {
  profile: Profile;
  notifications: OutboxMessage[];
  savedAt: string;
}

const canStore = () => typeof window !== "undefined" && Boolean(window.localStorage);

/**
 * Los casos vivos de este navegador, del más reciente al más antiguo.
 *
 * Lee a la defensiva: un `localStorage` con basura, con el formato de una
 * versión anterior o lleno no puede tumbar el portal. Ante la duda, la lista
 * está vacía y la demostración sigue.
 */
export function loadCases(now = Date.now()): LocalCase[] {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const alive = parsed.filter((item): item is LocalCase => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<LocalCase>;
      if (!candidate.profile?.id || typeof candidate.savedAt !== "string") return false;
      return now - new Date(candidate.savedAt).getTime() < CASE_TTL_MS;
    });

    /* Si algo caducó, se limpia al leer: nadie más va a pasar por aquí. */
    if (alive.length !== parsed.length) write(alive);
    return alive;
  } catch {
    return [];
  }
}

function write(cases: LocalCase[]) {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cases.slice(0, MAX_CASES)));
  } catch {
    /* Cuota llena o almacenamiento bloqueado: la demo funciona igual, solo que
       el caso no sobrevive al refresco. No vale la pena romper nada por esto. */
  }
  publish();
}

/* ── Suscripción, para que React lea esto sin pelearse ──────────────────
 *
 * `localStorage` es un sistema externo, y leerlo dentro de un efecto para
 * volcarlo a estado provoca justo el render en cascada que React desaconseja.
 * Con un snapshot cacheado y una lista de suscriptores, `useSyncExternalStore`
 * hace el trabajo bien: el servidor ve una lista vacía —no hay navegador—, el
 * cliente ve la suya al hidratar, y guardar o borrar un caso repinta solo lo
 * que corresponde. Además llegan los cambios de otras pestañas gratis.
 */

let snapshot: LocalCase[] | null = null;
const listeners = new Set<() => void>();

/** Invalida el snapshot y avisa. Se llama en cada escritura. */
function publish() {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function subscribeToCases(listener: () => void): () => void {
  listeners.add(listener);
  /* Otra pestaña del mismo navegador también puede crear o borrar un caso. */
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) publish(); };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Estable entre llamadas: React compara por identidad. */
export function casesSnapshot(): LocalCase[] {
  if (snapshot === null) snapshot = loadCases();
  return snapshot;
}

const EMPTY: LocalCase[] = [];
/** En el servidor no hay casos locales, y siempre es el mismo arreglo. */
export const serverCasesSnapshot = (): LocalCase[] => EMPTY;

/** Guarda el caso recién creado y lo deja de primero. */
export function saveCase(profile: Profile, notifications: OutboxMessage[], now = new Date()): LocalCase {
  const entry: LocalCase = { profile, notifications, savedAt: now.toISOString() };
  const others = loadCases(now.getTime()).filter((item) => item.profile.id !== profile.id);
  write([entry, ...others]);
  return entry;
}

/** El derecho a que no quede rastro, ejercido de verdad y no simulado. */
export function clearCases() {
  if (!canStore()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nada que hacer si el navegador lo impide. */
  }
  publish();
}

/** Los perfiles de los casos locales, para mezclarlos con el catálogo. */
export const localProfiles = (cases: LocalCase[]): Profile[] => cases.map((item) => item.profile);

/** Todos los correos generados en este navegador, del más reciente primero. */
export const localMessages = (cases: LocalCase[]): OutboxMessage[] => cases.flatMap((item) => item.notifications);
