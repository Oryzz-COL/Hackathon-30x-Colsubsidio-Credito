/**
 * Variables exógenas sin buscar a nadie.
 *
 * El documento del reto pide devolver información que Colsubsidio no tiene hoy.
 * La lectura fácil es salir a buscar a la persona —correo, redes, huella
 * pública— y es justamente la que este proyecto no va a hacer: no hay
 * autorización para eso y el propio reto prohíbe los burós.
 *
 * La lectura difícil, y la que de verdad mueve la aguja, es que el dato que
 * falta no es sobre la persona: es sobre el calendario en el que vive. Una
 * matrícula cierra, un predial vence, la prima entra en junio. Colsubsidio sabe
 * dónde trabaja y dónde vive cada afiliado, pero no cruza ese dato con el
 * almanaque, y por eso la oferta llega en marzo cuando servía en enero.
 *
 * Todo lo de aquí es público, verificable y no habla de ninguna persona en
 * particular: se deriva de la ciudad declarada y de la fecha de hoy. Cada
 * disparador viaja con su fuente y con su precisión —hay fechas legales que son
 * exactas y calendarios municipales que cambian cada año y solo se afirman por
 * mes—. Cuando la precisión es de mes, la interfaz lo dice; inventar un día
 * concreto sería exactamente el tipo de cifra que este producto no inventa.
 */

import type { ProductId, Urgency } from "@/lib/types";

export const CALENDAR_VERSION = "calendario-exogeno-2026.07";

export type TriggerPrecision = "DIA" | "MES";

export interface CalendarTrigger {
  id: string;
  label: string;
  /** Qué productos gana relevancia en esta ventana. */
  productIds: ProductId[];
  /** Meses (1–12) en los que la ventana está abierta. */
  months: number[];
  /** Día del mes en que cierra, solo cuando la fecha es legal y exacta. */
  closingDay?: number;
  /** Ciudades a las que aplica; vacío significa todo el país. */
  cities: string[];
  precision: TriggerPrecision;
  sourceLabel: string;
  sourceUrl?: string;
  /** Por qué esta ventana cambia la conversación. */
  rationale: string;
}

/**
 * El almanaque.
 *
 * Corto a propósito: seis ventanas que cubren las cinco familias de crédito del
 * reto. Ampliarlo es añadir filas, no tocar el motor.
 */
export const CALENDAR: CalendarTrigger[] = [
  {
    id: "matriculas-primer-semestre",
    label: "Matrículas del primer semestre",
    productIds: ["educativo"],
    months: [11, 12, 1, 2],
    cities: [],
    precision: "MES",
    sourceLabel: "Calendario académico de las instituciones de educación superior",
    rationale: "Quien va a estudiar en el primer semestre resuelve el pago entre noviembre y febrero. Ofrecerle financiación en abril llega tarde.",
  },
  {
    id: "matriculas-segundo-semestre",
    label: "Matrículas del segundo semestre",
    productIds: ["educativo"],
    months: [5, 6, 7],
    cities: [],
    precision: "MES",
    sourceLabel: "Calendario académico de las instituciones de educación superior",
    rationale: "La segunda ventana de matrícula del año concentra las decisiones de posgrado.",
  },
  {
    id: "temporada-escolar",
    label: "Temporada escolar",
    productIds: ["cupo-credito", "educativo"],
    months: [12, 1],
    cities: [],
    precision: "MES",
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    rationale: "El propio reglamento reconoce la jornada escolar: en esa temporada el cupo de crédito puede resolverse en dos horas.",
  },
  {
    id: "predial-bogota",
    label: "Impuesto predial de Bogotá",
    productIds: ["seguros-impuestos"],
    months: [3, 4, 5, 6],
    cities: ["Bogotá"],
    precision: "MES",
    sourceLabel: "Calendario tributario anual de la Secretaría de Hacienda Distrital",
    sourceUrl: "https://www.shd.gov.co/shd/calendario-tributario",
    rationale: "El predial concentra su vencimiento en el primer semestre y es el gasto que más rotativo estacional mueve.",
  },
  {
    id: "predial-municipal",
    label: "Impuesto predial municipal",
    productIds: ["seguros-impuestos"],
    months: [2, 3, 4, 5],
    cities: ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Mosquera"],
    precision: "MES",
    sourceLabel: "Calendario tributario que publica cada administración municipal",
    rationale: "Cada alcaldía fija sus fechas, pero el descuento por pronto pago se concentra en el primer cuatrimestre.",
  },
  {
    id: "prima-legal",
    label: "Prima legal de servicios",
    productIds: ["compra-cartera", "libre-inversion"],
    months: [6, 12],
    closingDay: 30,
    cities: [],
    precision: "DIA",
    sourceLabel: "Código Sustantivo del Trabajo, artículo 306",
    rationale: "La prima entra a más tardar el 30 de junio y el 20 de diciembre. Es el momento del año en que una consolidación de deuda se puede arrancar con un abono.",
  },
];

export interface ActiveTrigger extends CalendarTrigger {
  /** Días hasta el cierre de la ventana; negativo no ocurre, se filtra antes. */
  daysToClose: number;
  urgency: Urgency;
  /** La frase que ve la persona. */
  timing: string;
  /** La frase que justifica el momento ante quien audite. */
  reason: string;
}

/*
 * La ciudad llega en tres formatos según de dónde venga: "Bogotá D.C." del
 * selector, "Bogotá" de los perfiles de ejemplo y "Soacha, Cundinamarca" del
 * resto del listado. Comparar cadenas exactas fallaría en dos de los tres.
 */
const normalizeCity = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const cityMatches = (declared: string, target: string) => {
  const a = normalizeCity(declared);
  const b = normalizeCity(target);
  return a === b || a.startsWith(`${b} `) || a.startsWith(`${b},`);
};

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DAY = 86_400_000;

/** Último día de la ventana: el de cierre legal, o el fin del último mes. */
function windowClose(trigger: CalendarTrigger, now: Date): Date {
  const month = now.getMonth() + 1;
  const index = trigger.months.indexOf(month);
  /* Una ventana puede cruzar el año (noviembre a febrero): el cierre es el
     último mes consecutivo desde el actual, no el último del arreglo. */
  let cursor = month;
  let year = now.getFullYear();
  for (let step = index; step < trigger.months.length - 1; step += 1) {
    const next = trigger.months[step + 1]!;
    if (next !== (cursor % 12) + 1) break;
    if (next < cursor) year += 1;
    cursor = next;
  }
  return trigger.closingDay && cursor === trigger.months.at(-1)
    ? new Date(year, cursor - 1, trigger.closingDay, 23, 59, 59)
    : new Date(year, cursor, 0, 23, 59, 59);
}

function urgencyFor(days: number): Urgency {
  if (days <= 21) return "HIGH";
  if (days <= 60) return "MEDIUM";
  return "LOW";
}

function phrase(trigger: CalendarTrigger, days: number, close: Date): string {
  if (trigger.precision === "DIA") {
    return days <= 1
      ? `${trigger.label}: se paga hoy o mañana`
      : `Faltan ${days} días para ${trigger.label.toLowerCase()}`;
  }
  const month = MONTH_NAMES[close.getMonth()]!;
  return days <= 31
    ? `${trigger.label}: la ventana cierra en ${month}`
    : `${trigger.label}: la ventana está abierta hasta ${month}`;
}

/**
 * Los disparadores vigentes para una ciudad, hoy.
 *
 * Ordenados por urgencia: lo que vence antes va primero, porque es lo que hace
 * inútil esperar.
 */
export function activeTriggers(city: string | undefined, now = new Date()): ActiveTrigger[] {
  const month = now.getMonth() + 1;
  const place = city ?? "";

  return CALENDAR
    .filter((trigger) => trigger.months.includes(month))
    .filter((trigger) => trigger.cities.length === 0 || trigger.cities.some((item) => cityMatches(place, item)))
    .map((trigger) => {
      const close = windowClose(trigger, now);
      const daysToClose = Math.max(0, Math.ceil((close.getTime() - now.getTime()) / DAY));
      const urgency = urgencyFor(daysToClose);
      return {
        ...trigger,
        daysToClose,
        urgency,
        timing: phrase(trigger, daysToClose, close),
        reason: `${trigger.rationale} Fuente: ${trigger.sourceLabel}${trigger.precision === "MES" ? " (ventana por mes; la fecha exacta la publica la entidad cada año)" : ""}.`,
      };
    })
    .sort((a, b) => a.daysToClose - b.daysToClose);
}

/**
 * El disparador que le corresponde a una necesidad concreta.
 *
 * Solo devuelve algo cuando la ventana coincide con lo que la persona ya
 * declaró querer. Un predial abierto no convierte a nadie en candidato de
 * impuestos si nunca dijo que le preocupaba: eso sería usar el calendario para
 * empujar producto, que es la vieja costumbre que el reto quiere romper.
 */
export function triggerForNeed(
  city: string | undefined,
  productIds: ProductId[],
  now = new Date()
): ActiveTrigger | undefined {
  return activeTriggers(city, now).find((trigger) =>
    trigger.productIds.some((id) => productIds.includes(id))
  );
}
