import { NextResponse } from "next/server";
import { z } from "zod";
import { declaredEvidence } from "@/lib/validation/batch-row";
import { store } from "@/lib/store";

const schema = z.object({
  fullName: z.string().min(3).max(120),
  documentType: z.enum(["CC", "CE", "PPT"]).default("CC"),
  documentNumber: z.string().regex(/^[A-Za-z0-9]{5,20}$/),
  city: z.string().min(2).max(80),
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
});

export async function GET() {
  return NextResponse.json({ data: store.list(), synthetic: true });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  const { consent, needs, ...rest } = parsed.data;
  const id = crypto.randomUUID();
  const profile = store.add({
    ...rest,
    email: rest.email ?? "",
    phone: rest.phone ?? "",
    id,
    needs,
    affiliation: "Pendiente",
    consent,
    consentPurpose: parsed.data.consentPurpose ?? (consent ? "Perfilamiento de afinidad y contacto asesorado" : "No autorizada"),
    consentDate: consent ? new Date().toISOString() : undefined,
    synthetic: true,
    evidence: declaredEvidence(needs, "Formulario del afiliado", `FORM-${id.slice(0, 8)}`, consent),
  });
  store.log({ action: "PROFILE_CREATED", actor: "Asesora demo", detail: `Perfil ${profile.id} creado (PII omitida en el registro)` });
  return NextResponse.json({ data: profile }, { status: 201 });
}
