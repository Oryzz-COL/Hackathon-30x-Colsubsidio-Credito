import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { declaredEvidence } from "@/lib/validation/batch-row";
import { store } from "@/lib/store";
import type { Profile } from "@/lib/types";

const productId = z.enum(["cupo-credito", "educativo", "hipotecario", "compra-cartera", "mujeres", "libre-inversion", "complementario", "seguros-impuestos"]);
const channel = z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP", "CALL"]);
const consentPurpose = z.enum(["GUIDANCE", "BEHAVIOR_PERSONALIZATION", "COMMERCIAL_CONTACT", "AUTHORIZED_FINANCIAL_SIMULATION"]);
const preferences = z.object({
  interestedProductIds: z.array(productId).max(8),
  monthlyPayment: z.number().int().min(0).max(100_000_000).optional(),
  horizon: z.enum(["NOW", "THIS_MONTH", "NEXT_THREE_MONTHS", "EXPLORING"]),
  preferredChannel: channel,
  preferredTimeBand: z.enum(["WEEKDAY_MORNING", "WEEKDAY_AFTERNOON", "SATURDAY"]),
  maxContactFrequency: z.enum(["ONCE_WEEK", "TWICE_MONTH", "ONCE_MONTH", "NO_CONTACT"]),
  wantsAdvisor: z.boolean(),
});
const consentRecord = z.object({
  id: z.string().max(80),
  purpose: consentPurpose,
  scope: z.string().max(240),
  noticeVersion: z.string().max(60),
  grantedAt: z.string().datetime(),
  source: z.enum(["AFFILIATE_SELF_SERVICE", "ADVISOR_FORM"]),
  status: z.enum(["GRANTED", "REVOKED"]),
  channels: z.array(channel).max(5),
  revokedAt: z.string().datetime().optional(),
  synthetic: z.literal(true),
});
const behaviorEvent = z.object({
  id: z.string().max(80),
  type: z.enum(["credito_consultado", "credito_comparado", "simulacion_iniciada", "simulacion_completada", "solicitud_iniciada", "solicitud_abandonada", "oferta_visualizada", "oferta_aceptada", "canal_seleccionado", "contacto_solicitado", "preferencias_actualizadas", "consentimiento_otorgado", "consentimiento_revocado"]),
  occurredAt: z.string().datetime(),
  source: z.literal("FIRST_PARTY_DEMO"),
  productId: productId.optional(),
  authorizedPurpose: consentPurpose,
  consentVersion: z.string().max(60),
  retentionClass: z.literal("MVP_30_DAYS"),
  synthetic: z.literal(true),
});

const schema = z.object({
  fullName: z.string().min(3).max(120),
  documentType: z.enum(["CC", "CE", "PPT"]).default("CC"),
  documentNumber: z.string().regex(/^[A-Za-z0-9]{5,20}$/),
  city: z.string().min(2).max(80),
  category: z.enum(["A", "B", "C", "D"]).optional(),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
  addressOrZone: z.string().max(120).optional(),
  email: z.string().email().max(120).optional().or(z.literal("")),
  phone: z.string().regex(/^\d{7,12}$/).optional().or(z.literal("")),
  needs: z.array(z.string().max(120)).min(1).max(12),
  declaredObligations: z.boolean().default(false),
  tenureMonths: z.number().int().min(0).max(600).optional(),
  contractType: z.string().max(40).optional(),
  incomeRange: z.string().max(20).optional(),
  occupation: z.string().max(60).optional(),
  consent: z.boolean(),
  consentPurpose: z.string().max(160).optional(),
  origin: z.enum(["ADVISOR_FORM", "AFFILIATE_SELF_SERVICE"]).optional(),
  contactRequested: z.boolean().optional(),
  preferences: preferences.optional(),
  consents: z.array(consentRecord).max(12).optional(),
  behaviorEvents: z.array(behaviorEvent).max(40).optional(),
  rneExcluded: z.boolean().optional(),
  commercialContactBlocked: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ data: store.list(), synthetic: true });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  const { consent, needs, origin, contactRequested, ...rest } = parsed.data;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const draft: Profile = {
    ...rest,
    email: rest.email ?? "",
    phone: rest.phone ?? "",
    id,
    needs,
    affiliation: "Pendiente",
    consent,
    consentPurpose: parsed.data.consentPurpose ?? (consent ? "Perfilamiento de afinidad y contacto asesorado" : "No autorizada"),
    consentDate: consent ? now : undefined,
    synthetic: true,
    origin: origin ?? "ADVISOR_FORM",
    contactRequestedAt: contactRequested && origin === "AFFILIATE_SELF_SERVICE" ? now : undefined,
    externalDataStatus: origin === "AFFILIATE_SELF_SERVICE" ? "NOT_AVAILABLE_DEMO" : undefined,
    evidence: declaredEvidence(
      needs,
      origin === "AFFILIATE_SELF_SERVICE" ? "Autogestión del afiliado" : "Formulario del asesor",
      `FORM-${id.slice(0, 8)}`,
      consent
    ),
  };
  const guidanceProductIds = calculateAllAffinities(draft).slice(0, 3).map((result) => result.productId);
  const profile = store.add({ ...draft, guidanceProductIds });
  store.log({
    action: contactRequested ? "AFFILIATE_CONTACT_REQUESTED" : "PROFILE_CREATED",
    actor: origin === "AFFILIATE_SELF_SERVICE" ? "Afiliado demo" : "Asesora demo",
    detail: contactRequested
      ? `Caso ${profile.id.slice(0, 8)} creado desde autogestión; recomendación ${guidanceProductIds[0]} (PII omitida)`
      : `Perfil ${profile.id.slice(0, 8)} creado (PII omitida en el registro)`,
  });
  return NextResponse.json({ data: profile }, { status: 201 });
}
