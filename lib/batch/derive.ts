/**
 * Derivaciones explicables para lotes con información incompleta.
 *
 * Canal y momento se derivan únicamente de los campos disponibles y conservan
 * una razón junto a cada decisión. Viajan como `DERIVED`, nunca como hechos
 * observados.
 *
 * Dos reglas que no se negocian:
 *
 * 1. El género nunca se infiere del nombre. Si la columna no viene, no hay
 *    género, y Crédito Mujer simplemente no entra en la comparación.
 * 2. La edad no elige canal. El brief lo pide explícitamente y aquí no hay
 *    ninguna rama que la consulte.
 */

import type {
  ContactChannel,
  ContactHorizon,
  DeclaredGender,
  GoalHorizon,
  ProductId,
  Urgency,
} from "@/lib/types";

/** Una decisión derivada y su justificación legible. */
export interface Derived<T> {
  value: T;
  reason: string;
}

export interface ContactHints {
  declaredChannel?: string;
  email?: string;
  phone?: string;
}

/** Familias de necesidad que cambian el canal y el momento. */
export type NeedFamily =
  | "estacional"
  | "educativa"
  | "vivienda"
  | "alivio"
  | "emprendimiento"
  | "cotidiana"
  | "sin_clasificar";

const FAMILY_PATTERNS: [NeedFamily, RegExp][] = [
  ["estacional", /impuesto|seguro|predial|matr[ií]cula escolar|gasto estacional/],
  ["educativa", /educaci|posgrado|pregrado|estudio|matr[ií]cula|curso|t[eé]cnic|universidad/],
  ["vivienda", /vivienda|hipotec|cuota inicial|remodelaci|acabados|mejoras del hogar/],
  ["alivio", /cartera|consolidar|obligaci|simplificar pagos|mejorar plazo/],
  ["emprendimiento", /emprend|capital de trabajo|proyecto productivo|negocio/],
  ["cotidiana", /tecnolog|compras|cotidian|reutilizable|farmacia|alimentaci|vestuario|viaje/],
];

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** La familia de la primera necesidad que coincida; el orden importa. */
export function classifyNeeds(needs: string[]): NeedFamily {
  const corpus = normalize(needs.join(" "));
  for (const [family, pattern] of FAMILY_PATTERNS) {
    if (pattern.test(corpus)) return family;
  }
  return "sin_clasificar";
}

const CHANNEL_ALIASES: Record<string, ContactChannel> = {
  whatsapp: "WHATSAPP", wa: "WHATSAPP", "whats app": "WHATSAPP",
  correo: "EMAIL", email: "EMAIL", mail: "EMAIL",
  sms: "SMS", "mensaje de texto": "SMS",
  llamada: "CALL", telefono: "CALL", call: "CALL",
  portal: "IN_APP", app: "IN_APP", "in app": "IN_APP", "in_app": "IN_APP",
};

/**
 * El canal, y por qué ese y no otro.
 *
 * El orden de las reglas es el argumento: manda lo declarado, después la
 * urgencia de la necesidad, después qué vía de contacto autorizó la persona, y
 * al final el portal, que es el único canal que no interrumpe a nadie.
 */
export function deriveChannel(needs: string[], hints: ContactHints): Derived<ContactChannel> {
  const declared = CHANNEL_ALIASES[normalize(hints.declaredChannel ?? "").trim()];
  if (declared) {
    return { value: declared, reason: "El archivo declara la preferencia de canal de la persona." };
  }

  const family = classifyNeeds(needs);
  const hasPhone = Boolean(hints.phone?.trim());
  const hasEmail = Boolean(hints.email?.trim());

  if (family === "estacional" && hasPhone) {
    return {
      value: "WHATSAPP",
      reason: "La necesidad declarada tiene fecha límite y el archivo aporta un número autorizado.",
    };
  }
  if ((family === "vivienda" || family === "alivio") && hasPhone) {
    return {
      value: "CALL",
      reason: "Es una decisión que se conversa: la necesidad declarada requiere asesoría, no un mensaje.",
    };
  }
  if (hasEmail) {
    return {
      value: "EMAIL",
      reason: "El archivo aporta correo y la necesidad admite una explicación escrita con detalle.",
    };
  }
  if (hasPhone) {
    return {
      value: "WHATSAPP",
      reason: "El único dato de contacto autorizado en el archivo es el número de teléfono.",
    };
  }
  return {
    value: "IN_APP",
    reason: "El archivo no trae un canal autorizado: la orientación espera dentro del portal y no sale a buscar a nadie.",
  };
}

export interface DerivedTiming {
  horizon: ContactHorizon;
  goalHorizon: GoalHorizon;
  urgency: Urgency;
  /** Frase de momento, en el idioma del afiliado. */
  timing: string;
  reason: string;
}

/**
 * El momento, derivado de la necesidad.
 *
 * Sin fecha declarada, la propia necesidad dice cuándo: un impuesto vence, una
 * matrícula cierra, una vivienda se planea durante meses. Cuando el motor de
 * calendario encuentra un disparador con fecha para la ciudad de la persona,
 * ese gana: tiene día concreto y esto solo tiene una familia de necesidad.
 */
export function deriveTiming(needs: string[], trigger?: { timing: string; reason: string; urgency: Urgency }): DerivedTiming {
  if (trigger) {
    return {
      horizon: trigger.urgency === "HIGH" ? "NOW" : trigger.urgency === "MEDIUM" ? "THIS_MONTH" : "NEXT_THREE_MONTHS",
      goalHorizon: trigger.urgency === "HIGH" ? "NOW" : trigger.urgency === "MEDIUM" ? "ONE_TO_THREE_MONTHS" : "THREE_TO_TWELVE_MONTHS",
      urgency: trigger.urgency,
      timing: trigger.timing,
      reason: trigger.reason,
    };
  }

  switch (classifyNeeds(needs)) {
    case "estacional":
      return {
        horizon: "THIS_MONTH", goalHorizon: "ONE_TO_THREE_MONTHS", urgency: "HIGH",
        timing: "Antes del vencimiento del gasto que declaró",
        reason: "Impuestos y seguros tienen fecha de corte: después del vencimiento la oferta ya no sirve.",
      };
    case "educativa":
      return {
        horizon: "NEXT_THREE_MONTHS", goalHorizon: "ONE_TO_THREE_MONTHS", urgency: "MEDIUM",
        timing: "Antes del cierre de matrículas del periodo",
        reason: "La formación se decide contra un calendario académico, no cuando llega la oferta.",
      };
    case "alivio":
      return {
        horizon: "NOW", goalHorizon: "NOW", urgency: "HIGH",
        timing: "Ahora, porque cada mes que pasa paga la tasa anterior",
        reason: "Quien declara querer consolidar ya está pagando de más; esperar no le ayuda.",
      };
    case "vivienda":
      return {
        horizon: "NEXT_THREE_MONTHS", goalHorizon: "THREE_TO_TWELVE_MONTHS", urgency: "LOW",
        timing: "Durante la etapa de planeación, sin presión comercial",
        reason: "Una compra de vivienda se planea con meses; empujarla temprano solo genera rechazo.",
      };
    case "emprendimiento":
      return {
        horizon: "THIS_MONTH", goalHorizon: "ONE_TO_THREE_MONTHS", urgency: "MEDIUM",
        timing: "En las próximas semanas, mientras el proyecto está en marcha",
        reason: "Un proyecto productivo declarado tiene una ventana corta de arranque.",
      };
    case "cotidiana":
      return {
        horizon: "EXPLORING", goalHorizon: "EXPLORING", urgency: "LOW",
        timing: "Cuando la persona lo necesite: el cupo queda disponible",
        reason: "Un cupo rotativo no tiene fecha; su valor es estar antes de que haga falta.",
      };
    default:
      return {
        horizon: "EXPLORING", goalHorizon: "EXPLORING", urgency: "LOW",
        timing: "Mientras explora, sin presión comercial",
        reason: "La necesidad declarada no permite deducir un momento; forzarlo sería inventarlo.",
      };
  }
}

const GENDER_ALIASES: Record<string, DeclaredGender> = {
  mujer: "WOMAN", femenino: "WOMAN", f: "WOMAN", woman: "WOMAN",
  hombre: "MAN", masculino: "MAN", m: "MAN", man: "MAN",
  "no binario": "NON_BINARY", "nobinario": "NON_BINARY", "non binary": "NON_BINARY",
  "prefiero no responder": "PREFER_NOT_TO_SAY", "no responde": "PREFER_NOT_TO_SAY",
};

/**
 * Género declarado, y solo declarado.
 *
 * Si la columna no viene, esta función devuelve `undefined` y Crédito Mujer
 * queda fuera de la comparación de esa persona. Deducirlo del nombre sería
 * trivial de programar y es justamente lo que el producto promete no hacer.
 */
export function parseDeclaredGender(value?: string): DeclaredGender | undefined {
  return GENDER_ALIASES[normalize(value ?? "").trim()];
}

/** Los productos que resuelve cada familia, para cruzarlos con el calendario. */
const FAMILY_PRODUCTS: Record<NeedFamily, ProductId[]> = {
  estacional: ["seguros-impuestos", "cupo-credito"],
  educativa: ["educativo"],
  vivienda: ["hipotecario", "complementario"],
  alivio: ["compra-cartera"],
  emprendimiento: ["mujeres", "libre-inversion"],
  cotidiana: ["cupo-credito"],
  sin_clasificar: [],
};

export const productsForNeeds = (needs: string[]): ProductId[] =>
  FAMILY_PRODUCTS[classifyNeeds(needs)];

/** Franja horaria por canal: a nadie se le llama al amanecer. */
export function deriveTimeBand(channel: ContactChannel) {
  return channel === "CALL" ? ("WEEKDAY_AFTERNOON" as const) : ("WEEKDAY_MORNING" as const);
}
