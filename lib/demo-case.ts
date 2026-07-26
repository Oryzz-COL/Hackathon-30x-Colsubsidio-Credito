/**
 * Casos del afiliado aislados en su navegador.
 *
 * Los datos declarados no deben vivir en la memoria compartida de una instancia
 * serverless. Se usa una clave versionada, caducidad corta y un tope estricto
 * para mantener el handoff dentro de la sesión de la misma persona.
 */

import type { OutboxMessage } from "@/lib/notificaciones";
import type { Profile } from "@/lib/types";

const KEY = "creasy.casos.v1";

/** Un día permite retomar el recorrido sin conservar PII local indefinidamente. */
export const CASE_TTL_MS = 24 * 60 * 60 * 1000;

/** Tope defensivo de casos conservados por navegador. */
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
 * versión anterior o lleno no puede tumbar el portal. Ante la duda, devuelve
 * una lista vacía.
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
    /* Si la cuota está llena o el almacenamiento está bloqueado, el flujo
       continúa sin persistencia local. */
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
