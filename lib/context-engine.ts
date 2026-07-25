import { getProduct } from "@/config/products";
import type {
  BehaviorEvent,
  ContactChannel,
  Evidence,
  ProductId,
  Profile,
} from "@/lib/types";

export type ContextSignalStatus = "VIGENTE" | "VENCIDA" | "EXCLUIDA";

export interface ContextSignal {
  id: string;
  label: string;
  productId: ProductId;
  channel: ContactChannel;
  confidence: number;
  occurredAt: string;
  expiresAt: string;
  status: ContextSignalStatus;
  freshnessLabel: string;
}

export interface LiveContextSummary {
  status: "SIN_SENALES" | "CONTEXTO_DETECTADO";
  productId?: ProductId;
  productName?: string;
  confidence: number;
  signals: ContextSignal[];
  channel: ContactChannel;
  channelLabel: string;
  timing: string;
  nextAction: string;
  explanation: string;
  consented: boolean;
}

const DAY = 86_400_000;

const channelLabels: Record<ContactChannel, string> = {
  IN_APP: "Portal de Colsubsidio",
  EMAIL: "Correo electrónico",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  CALL: "Llamada de una asesora",
};

function hasBehaviorConsent(profile: Profile) {
  return Boolean(
    profile.consent &&
    profile.consents?.some(
      (record) =>
        record.purpose === "BEHAVIOR_PERSONALIZATION" &&
        record.status === "GRANTED"
    )
  );
}

function freshness(occurredAt: string, now: Date) {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(occurredAt).getTime()) / DAY)
  );
  if (days === 0) return "Detectada hoy";
  if (days === 1) return "Detectada ayer";
  return `Detectada hace ${days} días`;
}

export function getContextSignals(
  profile: Profile,
  now = new Date()
): ContextSignal[] {
  const consented = hasBehaviorConsent(profile);
  return (profile.behaviorEvents ?? [])
    .filter(
      (event): event is BehaviorEvent & {
        productId: ProductId;
        channel: ContactChannel;
        label: string;
        confidence: number;
        expiresAt: string;
      } =>
        Boolean(
          event.productId &&
          event.channel &&
          event.label &&
          typeof event.confidence === "number" &&
          event.expiresAt
        )
    )
    .map((event) => {
      const expired = new Date(event.expiresAt).getTime() < now.getTime();
      const status: ContextSignalStatus = !consented
        ? "EXCLUIDA"
        : expired
          ? "VENCIDA"
          : "VIGENTE";
      return {
        id: event.id,
        label: event.label,
        productId: event.productId,
        channel: event.channel,
        confidence: event.confidence,
        occurredAt: event.occurredAt,
        expiresAt: event.expiresAt,
        status,
        freshnessLabel: freshness(event.occurredAt, now),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
}

export function summarizeLiveContext(
  profile: Profile,
  now = new Date()
): LiveContextSummary {
  const consented = hasBehaviorConsent(profile);
  const signals = getContextSignals(profile, now);
  const active = signals.filter((signal) => signal.status === "VIGENTE");

  if (!active.length) {
    return {
      status: "SIN_SENALES",
      confidence: 0,
      signals,
      channel: profile.preferences?.preferredChannel ?? "IN_APP",
      channelLabel:
        channelLabels[profile.preferences?.preferredChannel ?? "IN_APP"],
      timing: "Esperar señales suficientes",
      nextAction: "No contactar ni inferir una necesidad",
      explanation: consented
        ? "Todavía no existen señales recientes suficientes para personalizar."
        : "La personalización comportamental está desactivada.",
      consented,
    };
  }

  const scores = new Map<ProductId, number>();
  for (const signal of active) {
    const age = Math.max(
      0,
      (now.getTime() - new Date(signal.occurredAt).getTime()) / DAY
    );
    const recency = Math.max(0.35, 1 - age / 30);
    scores.set(
      signal.productId,
      (scores.get(signal.productId) ?? 0) + signal.confidence * recency
    );
  }
  const [productId, score] = [...scores.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]!;
  const productSignals = active.filter(
    (signal) => signal.productId === productId
  );
  const channelCounts = new Map<ContactChannel, number>();
  for (const signal of productSignals) {
    channelCounts.set(
      signal.channel,
      (channelCounts.get(signal.channel) ?? 0) + 1
    );
  }
  const channel =
    [...channelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "IN_APP";
  const confidence = Math.min(
    96,
    Math.round(48 + score * 13 + productSignals.length * 4)
  );
  const product = getProduct(productId);

  return {
    status: "CONTEXTO_DETECTADO",
    productId,
    productName: product.name,
    confidence,
    signals,
    channel,
    channelLabel: channelLabels[channel],
    timing: "En la próxima visita al portal",
    nextAction:
      productId === "hipotecario"
        ? "Continuar una simulación hipotecaria"
        : `Explorar ${product.shortName.toLowerCase()}`,
    explanation: `${productSignals.length} señales recientes y consistentes indican interés en ${product.shortName.toLowerCase()}.`,
    consented,
  };
}

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY).toISOString();
}

function daysAhead(now: Date, days: number) {
  return new Date(now.getTime() + days * DAY).toISOString();
}

export function createLiveContextDemoProfile(now = new Date()): Profile {
  const createdAt = daysAgo(now, 20);
  return {
    id: "perfil-pulso-vivo",
    fullName: "Camila Restrepo",
    documentType: "CC",
    documentNumber: "99001042",
    city: "Bogotá",
    email: "camila.restrepo@ejemplo.test",
    phone: "3005551042",
    affiliation: "Activo",
    category: "B",
    addressOrZone: "Bogotá · zona urbana",
    employerOrSector: "Servicios",
    ageRange: "29–44",
    dependentsCount: 1,
    householdStatus: "Hogar con responsabilidades compartidas",
    housingStatus: "Arriendo",
    needs: ["explorar opciones"],
    declaredObligations: false,
    consent: true,
    consentPurpose: "Personalización con actividad propia autorizada",
    consentDate: createdAt,
    synthetic: true,
    origin: "SYNTHETIC_SEED",
    externalDataStatus: "NOT_AVAILABLE_DEMO",
    preferences: {
      interestedProductIds: [],
      horizon: "EXPLORING",
      preferredChannel: "IN_APP",
      preferredTimeBand: "SATURDAY",
      maxContactFrequency: "ONCE_MONTH",
      wantsAdvisor: false,
    },
    consents: [
      {
        id: "consent-pulso-guidance",
        purpose: "GUIDANCE",
        scope: "Orientación explicable",
        noticeVersion: "creasy-privacy-2026.07",
        grantedAt: createdAt,
        source: "AFFILIATE_SELF_SERVICE",
        status: "GRANTED",
        channels: [],
        synthetic: true,
      },
      {
        id: "consent-pulso-behavior",
        purpose: "BEHAVIOR_PERSONALIZATION",
        scope: "Actividad propia dentro de los canales de Colsubsidio",
        noticeVersion: "creasy-privacy-2026.07",
        grantedAt: createdAt,
        source: "AFFILIATE_SELF_SERVICE",
        status: "GRANTED",
        channels: ["IN_APP"],
        synthetic: true,
      },
    ],
    behaviorEvents: [],
    digitalInteractions: [],
    serviceUsage: [],
    declaredInterests: [],
    evidence: [
      {
        id: "ev-pulso-affiliation",
        label: "Estado de afiliación",
        value: "Activo",
        normalizedValue: "ACTIVO",
        sourceType: "COLSUBSIDIO_INTERNAL",
        sourceName: "Base interna simulada",
        sourceReference: "INT-PULSO-001",
        capturedAt: createdAt,
        lastVerifiedAt: daysAgo(now, 1),
        confidence: 0.98,
        consentScope: "OPERACION_AFILIACION",
        dataNature: "VERIFIED",
        evidenceStatus: "VIGENTE",
      },
    ],
  };
}

export function applyHousingContextScenario(
  profile: Profile,
  now = new Date()
): Profile {
  const events: BehaviorEvent[] = [
    {
      id: "pulse-benefit-housing",
      type: "beneficio_consultado",
      label: "Consultó información del subsidio de vivienda",
      productId: "hipotecario",
      channel: "IN_APP",
      confidence: 0.86,
      occurredAt: daysAgo(now, 6),
      expiresAt: daysAhead(now, 24),
      source: "FIRST_PARTY_DEMO",
      authorizedPurpose: "BEHAVIOR_PERSONALIZATION",
      consentVersion: "creasy-privacy-2026.07",
      retentionClass: "MVP_30_DAYS",
      synthetic: true,
    },
    {
      id: "pulse-projects-housing",
      type: "contenido_consultado",
      label: "Revisó dos proyectos de vivienda",
      productId: "hipotecario",
      channel: "IN_APP",
      confidence: 0.9,
      occurredAt: daysAgo(now, 3),
      expiresAt: daysAhead(now, 27),
      source: "FIRST_PARTY_DEMO",
      authorizedPurpose: "BEHAVIOR_PERSONALIZATION",
      consentVersion: "creasy-privacy-2026.07",
      retentionClass: "MVP_30_DAYS",
      synthetic: true,
    },
    {
      id: "pulse-simulation-housing",
      type: "simulacion_iniciada",
      label: "Inició una simulación hipotecaria",
      productId: "hipotecario",
      channel: "IN_APP",
      confidence: 0.96,
      occurredAt: daysAgo(now, 1),
      expiresAt: daysAhead(now, 29),
      source: "FIRST_PARTY_DEMO",
      authorizedPurpose: "BEHAVIOR_PERSONALIZATION",
      consentVersion: "creasy-privacy-2026.07",
      retentionClass: "MVP_30_DAYS",
      synthetic: true,
    },
  ];
  const evidence: Evidence[] = events.map((event, index) => ({
    id: `ev-${event.id}`,
    label: "Actividad propia autorizada",
    value: event.label!,
    normalizedValue: event.label!.toUpperCase(),
    sourceType: "COLSUBSIDIO_INTERNAL",
    sourceName: "Canales propios simulados",
    sourceReference: `PULSE-${index + 1}`,
    capturedAt: event.occurredAt,
    lastVerifiedAt: event.occurredAt,
    confidence: event.confidence!,
    consentScope: "PERSONALIZACION_COMPORTAMIENTO",
    dataNature: "OBSERVED",
    evidenceStatus: "VIGENTE",
  }));

  return {
    ...profile,
    behaviorEvents: events,
    digitalInteractions: events.map((event) => event.label!),
    serviceUsage: ["Vivienda", "Subsidios"],
    evidence: [...profile.evidence, ...evidence],
  };
}
