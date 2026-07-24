import { z } from "zod";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { declaredEvidence } from "@/lib/validation/batch-row";
import type { AffinityResult, Profile } from "@/lib/types";

export const AFFILIATE_NEEDS = [
  { value: "educacion", label: "Educación", needs: ["posgrado", "educación"] },
  { value: "vivienda", label: "Vivienda", needs: ["vivienda"] },
  { value: "compra-cartera", label: "Compra de cartera", needs: ["compra de cartera", "consolidar obligaciones"] },
  { value: "gastos-cotidianos", label: "Gastos cotidianos", needs: ["compras cotidianas"] },
  { value: "impuestos-seguros", label: "Impuestos o seguros", needs: ["impuestos", "seguros"] },
  { value: "otra", label: "Otro proyecto personal", needs: ["proyecto personal"] },
] as const;

const needValues = AFFILIATE_NEEDS.map((item) => item.value) as [
  (typeof AFFILIATE_NEEDS)[number]["value"],
  ...(typeof AFFILIATE_NEEDS)[number]["value"][],
];

export const affiliateGuidanceSchema = z.object({
  identifier: z.string().trim().regex(/^\d{5,12}$/, "Ingresa una cédula o identificador de 5 a 12 dígitos"),
  need: z.enum(needValues, { required_error: "Selecciona tu necesidad principal" }),
  incomeRange: z.string().max(40).optional(),
  employmentStatus: z.string().min(2, "Selecciona tu situación laboral").max(60),
  tenureMonths: z.number().int().min(0, "La antigüedad no puede ser negativa").max(600).optional(),
  consent: z.boolean().refine(Boolean, "Debes autorizar el tratamiento y consulta de datos"),
});

export type AffiliateGuidanceInput = z.infer<typeof affiliateGuidanceSchema>;

const employmentLabels: Record<string, string> = {
  indefinido: "Indefinido",
  fijo: "Término fijo",
  independiente: "Independiente",
  pensionado: "Pensionado",
  otro: "Otro",
};

export function createAffiliateProfile(
  input: AffiliateGuidanceInput,
  options: { id?: string; now?: string; contactRequested?: boolean } = {}
): Profile {
  const parsed = affiliateGuidanceSchema.parse(input);
  const selectedNeed = AFFILIATE_NEEDS.find((item) => item.value === parsed.need)!;
  const id = options.id ?? crypto.randomUUID();
  const now = options.now ?? new Date().toISOString();
  const contactRequested = options.contactRequested ?? false;

  return {
    id,
    fullName: "Afiliado autogestión",
    documentType: "CC",
    documentNumber: parsed.identifier,
    city: "No declarada",
    email: "",
    phone: "",
    affiliation: "Pendiente",
    contractType: employmentLabels[parsed.employmentStatus] ?? parsed.employmentStatus,
    tenureMonths: parsed.tenureMonths,
    incomeRange: parsed.incomeRange || undefined,
    occupation: employmentLabels[parsed.employmentStatus] ?? parsed.employmentStatus,
    needs: [...selectedNeed.needs],
    declaredObligations: parsed.need === "compra-cartera",
    consent: parsed.consent,
    consentPurpose: "Orientación de afinidad y contacto con un asesor",
    consentDate: now,
    synthetic: true,
    origin: "AFFILIATE_SELF_SERVICE",
    contactRequestedAt: contactRequested ? now : undefined,
    externalDataStatus: "NOT_AVAILABLE_DEMO",
    evidence: declaredEvidence(
      [...selectedNeed.needs],
      "Autogestión del afiliado",
      `SELF-${id.slice(0, 8)}`,
      parsed.consent
    ),
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
  const selectedNeed = AFFILIATE_NEEDS.find((item) => item.value === input.need)!;
  return {
    fullName: "Afiliado autogestión",
    documentType: "CC" as const,
    documentNumber: input.identifier,
    city: "No declarada",
    email: "",
    phone: "",
    needs: [...selectedNeed.needs],
    declaredObligations: input.need === "compra-cartera",
    tenureMonths: input.tenureMonths,
    contractType: employmentLabels[input.employmentStatus] ?? input.employmentStatus,
    incomeRange: input.incomeRange || undefined,
    occupation: employmentLabels[input.employmentStatus] ?? input.employmentStatus,
    consent: input.consent,
    consentPurpose: "Orientación de afinidad y contacto con un asesor",
    origin: "AFFILIATE_SELF_SERVICE" as const,
    contactRequested: true,
  };
}
