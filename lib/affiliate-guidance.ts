import { z } from "zod";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { declaredEvidence } from "@/lib/validation/batch-row";
import { behaviorEvent, CONSENT_NOTICE_VERSION } from "@/lib/personalization";
import { evaluateDecision, type DecisionResult } from "@/lib/decision/engine";
import { isKnownCity } from "@/data/ciudades";
import type { AffinityResult, ConsentPurpose, ProductId, Profile } from "@/lib/types";

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
  /*
   * La cédula colombiana tiene entre 6 y 10 dígitos y ningún otro carácter.
   * Validarlo aquí, y no solo en el navegador, es lo que impide que la base se
   * llene de "1.020.304.050", "CC 1020304050" y "no tengo a la mano".
   */
  identifier: z.string().trim().regex(/^\d{6,10}$/, "La cédula tiene entre 6 y 10 dígitos, sin puntos ni letras"),
  fullName: z.string().trim().min(3, "Ingresa tu nombre").max(120),
  /* Obligatorio: sin correo no podemos enviarte el resultado de tu solicitud. */
  email: z.string().trim().min(1, "Necesitamos tu correo para enviarte el resultado").email("Escribe un correo válido, con @ y dominio").max(120),
  addressOrZone: z.string().trim().min(2, "Selecciona tu ciudad").max(120)
    .refine(isKnownCity, "Selecciona una ciudad de la lista"),
  affiliationCategory: z.enum(["A", "B", "C", "D"], { required_error: "Selecciona tu categoría de afiliación" }),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"], { required_error: "Selecciona tu género declarado" }),
  need: z.enum(needValues, { required_error: "Selecciona tu necesidad principal" }),
  incomeRange: z.string().max(40).optional(),
  employmentStatus: z.string().min(2, "Selecciona tu situación laboral").max(60),
  tenureMonths: z.number().int().min(0, "La antigüedad no puede ser negativa").max(600).optional(),
  monthlyPayment: z.number().int().min(0).max(100_000_000).optional(),
  loanAmount: z.number().int().min(0).max(500_000_000).optional(),
  termMonths: z.number().int().min(1).max(120).default(24),
  dependents: z.number().int().min(0).max(20).optional(),
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
    email: parsed.email,
    phone: "",
    affiliation: "Pendiente",
    category: parsed.affiliationCategory,
    gender: parsed.gender,
    contractType: employmentLabels[parsed.employmentStatus] ?? parsed.employmentStatus,
    tenureMonths: parsed.tenureMonths,
    incomeRange: parsed.incomeRange || undefined,
    occupation: employmentLabels[parsed.employmentStatus] ?? parsed.employmentStatus,
    dependentsCount: parsed.dependents,
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
    estimatedNeedRange: [
      parsed.loanAmount ? `Monto aproximado $${parsed.loanAmount.toLocaleString("es-CO")}` : null,
      parsed.monthlyPayment ? `cuota estimada $${parsed.monthlyPayment.toLocaleString("es-CO")}/mes` : null,
    ].filter(Boolean).join(" · ") || undefined,
    requestedAmount: parsed.loanAmount,
    requestedTermMonths: parsed.termMonths,
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
  decision: DecisionResult;
} {
  const profile = createAffiliateProfile(input, { id: "affiliate-preview" });
  const recommendations = calculateAllAffinities(profile).slice(0, 3);
  return { profile, recommendations, decision: decisionFor(input, recommendations[0]!.productId) };
}

/**
 * Viabilidad del escenario que la persona planteó sobre el producto de mayor
 * afinidad. La afinidad elige el producto; esto decide si el monto y el plazo
 * pedidos se sostienen con lo que declaró.
 */
export function decisionFor(input: AffiliateGuidanceInput, productId: ProductId): DecisionResult {
  return evaluateDecision({
    productId,
    amount: input.loanAmount ?? 0,
    termMonths: input.termMonths,
    incomeRange: input.incomeRange,
    category: input.affiliationCategory,
    employmentStatus: input.employmentStatus,
    tenureMonths: input.tenureMonths,
    dependents: input.dependents,
    declaredObligations: input.need === "compra-cartera",
    gender: input.gender,
    consent: input.guidanceConsent,
  });
}

export function affiliateContactPayload(input: AffiliateGuidanceInput) {
  const profile = createAffiliateProfile(input, { contactRequested: true });
  return {
    fullName: profile.fullName,
    documentType: profile.documentType,
    documentNumber: profile.documentNumber,
    city: profile.city,
    category: profile.category,
    gender: profile.gender,
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
    loanAmount: input.loanAmount,
    termMonths: input.termMonths,
    origin: profile.origin,
    contactRequested: true,
    preferences: profile.preferences,
    consents: profile.consents,
    behaviorEvents: profile.behaviorEvents,
    rneExcluded: profile.rneExcluded,
    commercialContactBlocked: profile.commercialContactBlocked,
  };
}
