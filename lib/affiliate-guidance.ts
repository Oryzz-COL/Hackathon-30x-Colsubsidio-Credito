import { z } from "zod";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { declaredEvidence } from "@/lib/validation/batch-row";
import { behaviorEvent, CONSENT_NOTICE_VERSION } from "@/lib/personalization";
import type { AffinityResult, ConsentPurpose, Profile } from "@/lib/types";

export const AFFILIATE_NEEDS = [
  { value: "educacion", label: "Educación", needs: ["posgrado", "educación"] },
  { value: "vivienda", label: "Vivienda", needs: ["vivienda"] },
  { value: "compra-cartera", label: "Compra de cartera", needs: ["compra de cartera", "consolidar obligaciones"] },
  { value: "gastos-cotidianos", label: "Gastos cotidianos", needs: ["compras cotidianas"] },
  { value: "impuestos-seguros", label: "Impuestos o seguros", needs: ["impuestos", "seguros"] },
  { value: "mujer-emprende", label: "Proyecto productivo o emprendimiento", needs: ["emprendimiento", "proyecto productivo"] },
  { value: "otra", label: "Otro proyecto personal", needs: ["proyecto personal"] },
] as const;

const needValues = AFFILIATE_NEEDS.map((item) => item.value) as [
  (typeof AFFILIATE_NEEDS)[number]["value"],
  ...(typeof AFFILIATE_NEEDS)[number]["value"][],
];

const productIds = [
  "cupo-credito", "educativo", "hipotecario", "compra-cartera",
  "mujeres", "libre-inversion", "complementario", "seguros-impuestos",
] as const;

export const affiliateGuidanceSchema = z.object({
  identifier: z.string().trim().regex(/^\d{5,12}$/, "Ingresa una cédula o identificador de 5 a 12 dígitos"),
  fullName: z.string().trim().min(3, "Ingresa tu nombre").max(120),
  email: z.string().trim().email("Ingresa un correo válido").max(120).optional().or(z.literal("")),
  addressOrZone: z.string().trim().min(2, "Indica tu ciudad o zona").max(120),
  affiliationCategory: z.enum(["A", "B", "C", "D"], { required_error: "Selecciona tu categoría de afiliación" }),
  need: z.enum(needValues, { required_error: "Selecciona tu necesidad principal" }),
  incomeRange: z.string().max(40).optional(),
  employmentStatus: z.string().min(2, "Selecciona tu situación laboral").max(60),
  tenureMonths: z.number().int().min(0, "La antigüedad no puede ser negativa").max(600).optional(),
  monthlyPayment: z.number().int().min(0).max(100_000_000).optional(),
  horizon: z.enum(["NOW", "THIS_MONTH", "NEXT_THREE_MONTHS", "EXPLORING"]).default("EXPLORING"),
  preferredChannel: z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP", "CALL"]).default("IN_APP"),
  preferredTimeBand: z.enum(["WEEKDAY_MORNING", "WEEKDAY_AFTERNOON", "SATURDAY"]).default("WEEKDAY_MORNING"),
  contactFrequency: z.enum(["ONCE_WEEK", "TWICE_MONTH", "ONCE_MONTH", "NO_CONTACT"]).default("ONCE_MONTH"),
  wantsAdvisor: z.boolean().default(false),
  interestedProducts: z.array(z.enum(productIds)).max(8).default([]),
  guidanceConsent: z.boolean().refine(Boolean, "Debes autorizar el uso de los datos declarados para recibir orientación"),
  behaviorConsent: z.boolean().default(false),
  contactConsent: z.boolean().default(false),
  financialDataConsent: z.boolean().default(false),
  rneExcluded: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.wantsAdvisor && !data.contactConsent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactConsent"], message: "Autoriza el contacto comercial para solicitar una asesora" });
  }
});

export type AffiliateGuidanceInput = z.infer<typeof affiliateGuidanceSchema>;

const employmentLabels: Record<string, string> = {
  indefinido: "Indefinido",
  fijo: "Término fijo",
  independiente: "Independiente",
  pensionado: "Pensionado",
  otro: "Otro",
};

function consentRecords(input: AffiliateGuidanceInput, now: string) {
  const options: Array<[ConsentPurpose, boolean, string]> = [
    ["GUIDANCE", input.guidanceConsent, "Orientación de afinidad con datos declarados"],
    ["BEHAVIOR_PERSONALIZATION", input.behaviorConsent, "Personalización con interacciones propias de este prototipo"],
    ["COMMERCIAL_CONTACT", input.contactConsent, "Contacto por el canal y frecuencia elegidos"],
    ["AUTHORIZED_FINANCIAL_SIMULATION", input.financialDataConsent, "Uso de datos financieros declarados para una simulación"],
  ];
  return options.filter(([, granted]) => granted).map(([purpose, , scope]) => ({
    id: crypto.randomUUID(),
    purpose,
    scope,
    noticeVersion: CONSENT_NOTICE_VERSION,
    grantedAt: now,
    source: "AFFILIATE_SELF_SERVICE" as const,
    status: "GRANTED" as const,
    channels: purpose === "COMMERCIAL_CONTACT" ? [input.preferredChannel] : [],
    synthetic: true as const,
  }));
}

export function createAffiliateProfile(
  input: AffiliateGuidanceInput,
  options: { id?: string; now?: string; contactRequested?: boolean } = {}
): Profile {
  const parsed = affiliateGuidanceSchema.parse(input);
  const selectedNeed = AFFILIATE_NEEDS.find((item) => item.value === parsed.need)!;
  const id = options.id ?? crypto.randomUUID();
  const now = options.now ?? new Date().toISOString();
  const contactRequested = options.contactRequested ?? false;
  const needs = [...new Set([...selectedNeed.needs, ...parsed.interestedProducts])];
  const consents = consentRecords(parsed, now);
  const events = [
    behaviorEvent("consentimiento_otorgado", "GUIDANCE", now),
    behaviorEvent("preferencias_actualizadas", "GUIDANCE", now),
    ...(parsed.behaviorConsent ? [behaviorEvent("credito_consultado", "BEHAVIOR_PERSONALIZATION", now)] : []),
    ...(contactRequested ? [behaviorEvent("contacto_solicitado", "COMMERCIAL_CONTACT", now)] : []),
  ];

  return {
    id,
    fullName: parsed.fullName,
    documentType: "CC",
    documentNumber: parsed.identifier,
    city: parsed.addressOrZone,
    addressOrZone: parsed.addressOrZone,
    email: parsed.email ?? "",
    phone: "",
    affiliation: "Pendiente",
    category: parsed.affiliationCategory,
    contractType: employmentLabels[parsed.employmentStatus] ?? parsed.employmentStatus,
    tenureMonths: parsed.tenureMonths,
    incomeRange: parsed.incomeRange || undefined,
    occupation: employmentLabels[parsed.employmentStatus] ?? parsed.employmentStatus,
    declaredGoal: selectedNeed.label,
    lifeEvent:
      parsed.horizon === "NOW" ? `Necesidad inmediata: ${selectedNeed.label}`
      : parsed.horizon === "THIS_MONTH" ? `Meta para este mes: ${selectedNeed.label}`
      : parsed.horizon === "NEXT_THREE_MONTHS" ? `Meta para los próximos tres meses: ${selectedNeed.label}`
      : `Exploración de alternativas para ${selectedNeed.label}`,
    goalHorizon:
      parsed.horizon === "NOW" ? "NOW"
      : parsed.horizon === "NEXT_THREE_MONTHS" ? "ONE_TO_THREE_MONTHS"
      : parsed.horizon === "THIS_MONTH" ? "ONE_TO_THREE_MONTHS"
      : "EXPLORING",
    estimatedNeedRange: parsed.monthlyPayment ? `Cuota declarada hasta $${parsed.monthlyPayment.toLocaleString("es-CO")} mensuales` : undefined,
    urgency: parsed.horizon === "NOW" ? "HIGH" : parsed.horizon === "EXPLORING" ? "LOW" : "MEDIUM",
    serviceUsage: [selectedNeed.label],
    digitalInteractions: parsed.behaviorConsent ? [`Consultó orientación de ${selectedNeed.label}`] : [],
    declaredInterests: [selectedNeed.label, ...selectedNeed.needs.slice(0, 2)],
    needs,
    declaredObligations: parsed.need === "compra-cartera",
    consent: parsed.guidanceConsent,
    consentPurpose: "Orientación de afinidad con datos declarados",
    consentDate: now,
    synthetic: true,
    origin: "AFFILIATE_SELF_SERVICE",
    contactRequestedAt: contactRequested ? now : undefined,
    externalDataStatus: "NOT_AVAILABLE_DEMO",
    preferences: {
      interestedProductIds: parsed.interestedProducts,
      monthlyPayment: parsed.monthlyPayment,
      horizon: parsed.horizon,
      preferredChannel: parsed.preferredChannel,
      preferredTimeBand: parsed.preferredTimeBand,
      maxContactFrequency: parsed.contactFrequency,
      wantsAdvisor: parsed.wantsAdvisor,
    },
    consents,
    behaviorEvents: events,
    rneExcluded: parsed.rneExcluded,
    commercialContactBlocked: parsed.contactFrequency === "NO_CONTACT",
    evidence: declaredEvidence(needs, "Autogestión del afiliado", `SELF-${id.slice(0, 8)}`, parsed.guidanceConsent),
  };
}

export function calculateAffiliateGuidance(input: AffiliateGuidanceInput): {
  profile: Profile;
  recommendations: AffinityResult[];
} {
  const profile = createAffiliateProfile(input, { id: "affiliate-preview" });
  return { profile, recommendations: calculateAllAffinities(profile).slice(0, 3) };
}

export function affiliateContactPayload(input: AffiliateGuidanceInput) {
  const profile = createAffiliateProfile(input, { contactRequested: true });
  return {
    fullName: profile.fullName,
    documentType: profile.documentType,
    documentNumber: profile.documentNumber,
    city: profile.city,
    category: profile.category,
    addressOrZone: profile.addressOrZone,
    email: profile.email,
    phone: profile.phone,
    needs: profile.needs,
    declaredObligations: profile.declaredObligations,
    tenureMonths: profile.tenureMonths,
    contractType: profile.contractType,
    incomeRange: profile.incomeRange,
    occupation: profile.occupation,
    consent: profile.consent,
    consentPurpose: profile.consentPurpose,
    origin: profile.origin,
    contactRequested: true,
    preferences: profile.preferences,
    consents: profile.consents,
    behaviorEvents: profile.behaviorEvents,
    rneExcluded: profile.rneExcluded,
    commercialContactBlocked: profile.commercialContactBlocked,
  };
}
