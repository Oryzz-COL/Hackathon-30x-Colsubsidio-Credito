import type {
  AffinityResult,
  BehaviorEvent,
  BehaviorEventType,
  ConsentPurpose,
  ContactChannel,
  ContactFrequency,
  Profile,
} from "@/lib/types";

export const CONSENT_NOTICE_VERSION = "creasy-privacy-2026.07";

export function hasActiveConsent(profile: Profile, purpose: ConsentPurpose) {
  return Boolean(profile.consents?.some((record) => record.purpose === purpose && record.status === "GRANTED"));
}

function bogotaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
  };
}

function frequencyDays(frequency: ContactFrequency) {
  if (frequency === "ONCE_WEEK") return 7;
  if (frequency === "TWICE_MONTH") return 14;
  if (frequency === "ONCE_MONTH") return 30;
  return Number.POSITIVE_INFINITY;
}

/**
 * Política de contacto, con dos clases de impedimento que no son lo mismo.
 *
 * `blockers` son motivos de fondo —falta autorización, el titular pidió que no
 * lo contacten, RNE, frecuencia agotada— y significan que este contacto no debe
 * ocurrir. `timing` es solo la franja horaria: el contacto sí procede, pero no
 * a esta hora.
 *
 * La distinción importa porque una persona asesora puede revisar y aprobar un
 * caso a las once de la noche; lo que no puede es llamar a esa hora. Tratar
 * ambas cosas como "bloqueado" convertía la bandeja en un muro de rojo fuera de
 * horario de oficina e impedía trabajar.
 */
export function evaluateContactPolicy(profile: Profile, now = new Date(), isHoliday = false) {
  const blockers: string[] = [];
  const timing: string[] = [];
  const channel: ContactChannel = profile.preferences?.preferredChannel ?? "IN_APP";
  const { weekday, hour } = bogotaParts(now);
  const saturday = weekday === "Sat";
  const sunday = weekday === "Sun";
  const withinHours = saturday ? hour >= 8 && hour < 15 : !sunday && hour >= 7 && hour < 19;

  if (!hasActiveConsent(profile, "COMMERCIAL_CONTACT")) blockers.push("No existe autorización vigente para contacto comercial.");
  if (profile.commercialContactBlocked) blockers.push("El titular bloqueó el contacto comercial.");
  if (profile.rneExcluded) blockers.push("El perfil está marcado como excluido por RNE en esta simulación.");
  if (profile.preferences?.maxContactFrequency === "NO_CONTACT") blockers.push("La frecuencia elegida es no recibir contacto.");

  if (isHoliday || sunday) timing.push("No se realizan contactos los domingos ni festivos.");
  else if (!withinHours) timing.push("Fuera de la franja permitida: de lunes a viernes de 7:00 a 19:00 y sábados de 8:00 a 15:00.");

  if (profile.lastCommercialContactAt && profile.preferences) {
    const elapsedDays = (now.getTime() - new Date(profile.lastCommercialContactAt).getTime()) / 86_400_000;
    if (elapsedDays < frequencyDays(profile.preferences.maxContactFrequency)) {
      blockers.push("Aún no se cumple la frecuencia máxima elegida por el titular.");
    }
  }

  const reasons = [...blockers, ...timing];
  return {
    /** Se puede contactar ahora mismo. */
    allowed: reasons.length === 0,
    /** Se puede autorizar el contacto, aunque el envío espere a la franja. */
    approvable: blockers.length === 0,
    blockers,
    timing,
    reasons,
    channel,
    label:
      blockers.length > 0 ? "Contacto bloqueado"
      : timing.length > 0 ? "Autorizable, fuera de franja"
      : "Contacto permitido en esta franja",
  };
}

export function buildNextBestAction(profile: Profile, top: AffinityResult, now = new Date(), isHoliday = false) {
  const contact = evaluateContactPolicy(profile, now, isHoliday);
  const horizon = profile.preferences?.horizon ?? "EXPLORING";
  const missing = top.missingSignals.slice(0, 3);
  const wantsAdvisor = Boolean(profile.preferences?.wantsAdvisor);

  let action: NextAction;
  if (profile.commercialContactBlocked || profile.rneExcluded || profile.preferences?.maxContactFrequency === "NO_CONTACT") action = "DO_NOT_CONTACT";
  else if (wantsAdvisor && contact.allowed) action = "SCHEDULE_ADVISOR";
  else if (missing.length > 1) action = "REQUEST_MISSING_DATA";
  else if (horizon === "NOW" || horizon === "THIS_MONTH") action = "INVITE_SIMULATION";
  else if (horizon === "EXPLORING") action = "SHOW_IN_APP";
  else action = "WAIT";

  return {
    action,
    /* El identificador viaja para la auditoría; la etiqueta, para la pantalla. */
    actionLabel: actionLabels[action],
    channelLabel: channelLabels[contact.channel],
    advisorActionLabel: advisorActionLabels[action],
    productId: top.productId,
    why: top.positiveSignals.slice(0, 3),
    moment:
      horizon === "NOW" ? "Indicó que quiere avanzar ahora."
      : horizon === "THIS_MONTH" ? "Indicó interés para este mes."
      : horizon === "NEXT_THREE_MONTHS" ? "Está planeando para los próximos tres meses."
      : "Está explorando opciones sin urgencia declarada.",
    missing,
    channel: contact.channel,
    contact,
    requiresHumanReview: true,
    disclaimer: "Orientación explicable; no representa aprobación, oferta ni decisión de crédito.",
  };
}

/**
 * Los nombres que ve una persona.
 *
 * Los identificadores internos (`WHATSAPP`, `INVITE_SIMULATION`) sirven para
 * comparar en código y para auditar; no sirven para hablarle a nadie. Que se
 * escaparan a la pantalla del afiliado era el único punto donde la interfaz
 * dejaba ver su propia plomería.
 */
export const channelLabels: Record<ContactChannel, string> = {
  IN_APP: "Portal de Colsubsidio",
  EMAIL: "Correo electrónico",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  CALL: "Llamada de una asesora",
};

export type NextAction =
  | "SHOW_IN_APP" | "INVITE_SIMULATION" | "REQUEST_MISSING_DATA"
  | "SCHEDULE_ADVISOR" | "DO_NOT_CONTACT" | "WAIT";

/** En segunda persona: lo que va a pasar, dicho a quien le pasa. */
export const actionLabels: Record<NextAction, string> = {
  SHOW_IN_APP: "Dejar la información disponible en el portal, sin contacto comercial",
  INVITE_SIMULATION: "Invitarte a simular el crédito con tus propias cifras",
  REQUEST_MISSING_DATA: "Pedirte los datos que faltan antes de avanzar",
  SCHEDULE_ADVISOR: "Agendar el acompañamiento de una persona asesora",
  DO_NOT_CONTACT: "No contactarte: pediste no recibir comunicaciones comerciales",
  WAIT: "Esperar a que llegue tu momento declarado",
};

/** La misma acción, contada a la persona asesora que va a ejecutarla. */
export const advisorActionLabels: Record<NextAction, string> = {
  SHOW_IN_APP: "Dejar disponible en el portal",
  INVITE_SIMULATION: "Invitar a simular",
  REQUEST_MISSING_DATA: "Solicitar datos faltantes",
  SCHEDULE_ADVISOR: "Agendar asesoría",
  DO_NOT_CONTACT: "No contactar",
  WAIT: "Esperar el momento declarado",
};

export const timeBandLabels = {
  WEEKDAY_MORNING: "lunes a viernes en la mañana",
  WEEKDAY_AFTERNOON: "lunes a viernes en la tarde",
  SATURDAY: "sábado entre 8:00 a. m. y 3:00 p. m.",
} as const;

export function buildPersonalizedOffer(profile: Profile, top: AffinityResult) {
  const channel = profile.preferences?.preferredChannel ?? "IN_APP";
  const timeBand = profile.preferences?.preferredTimeBand ?? "WEEKDAY_MORNING";
  const firstName = profile.fullName.split(" ")[0] ?? "Afiliado";
  const productName = top.productId === "hipotecario" ? "crédito de vivienda" : top.productId === "mujeres" ? "Crédito Mujer" : top.productId === "educativo" ? "crédito educativo" : top.productId === "cupo-credito" ? "cupo de crédito rotativo" : "producto de crédito";
  const goal = profile.declaredGoal ?? profile.needs[0] ?? "tu objetivo";
  const moment =
    profile.goalHorizon === "NOW" ? "Ahora, porque declaraste una necesidad inmediata"
    : profile.goalHorizon === "ONE_TO_THREE_MONTHS" ? "En las próximas semanas, antes de tu meta de 1 a 3 meses"
    : profile.goalHorizon === "THREE_TO_TWELVE_MONTHS" ? "Durante la etapa de planeación, antes de avanzar con tu meta"
    : "Mientras exploras, sin presión comercial";

  return {
    detectedNeed: goal,
    productName,
    channel,
    channelLabel: channelLabels[channel],
    timing: moment,
    timeBandLabel: timeBandLabels[timeBand],
    message: `${firstName}, te recomendamos explorar ${productName} porque corresponde a esta meta declarada: ${goal.toLowerCase()}. Encontramos ${Math.max(3, top.positiveSignals.length)} señales relacionadas y elegiste ${channelLabels[channel]} como canal. Esta orientación no es una aprobación de crédito.`,
    signals: top.positiveSignals.slice(0, 5),
    nextStep: profile.preferences?.wantsAdvisor ? "Revisión humana antes de cualquier contacto" : "Explorar información dentro del portal",
  };
}

export function behaviorEvent(
  type: BehaviorEventType,
  authorizedPurpose: ConsentPurpose,
  occurredAt: string,
  productId?: BehaviorEvent["productId"],
): BehaviorEvent {
  return {
    id: crypto.randomUUID(),
    type,
    occurredAt,
    source: "FIRST_PARTY_DEMO",
    productId,
    authorizedPurpose,
    consentVersion: CONSENT_NOTICE_VERSION,
    retentionClass: "MVP_30_DAYS",
    synthetic: true,
  };
}
