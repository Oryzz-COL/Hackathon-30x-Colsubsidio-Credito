import { NextResponse } from "next/server";
import { z } from "zod";
import { EXTERNAL_PROFILE_BY_DOCUMENT } from "@/data/external-profiles";
import {
  simulateEnrichmentDelivery,
} from "@/lib/enrichment/delivery";
import {
  normalizeDocument,
  runEnrichment,
} from "@/lib/enrichment/engine";
import { enrichmentConsentSchema } from "@/lib/enrichment/schema";

const deliverySchema = z.object({
  documentNumber: z.string().min(6).max(24),
  consent: enrichmentConsentSchema,
});

export async function POST(request: Request) {
  const parsed = deliverySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "No fue posible preparar la entrega." }, { status: 400 });
  }

  const documentNumber = normalizeDocument(parsed.data.documentNumber);
  const profile = EXTERNAL_PROFILE_BY_DOCUMENT.get(documentNumber);
  if (!profile) {
    return NextResponse.json({ error: "No existe un perfil sintético para esa cédula." }, { status: 404 });
  }

  const result = runEnrichment({
    documentNumber,
    consent: parsed.data.consent,
  });
  const receipt = simulateEnrichmentDelivery(result, profile);
  if (!receipt) {
    return NextResponse.json({ error: "La recomendación no tiene señales suficientes." }, { status: 409 });
  }

  return NextResponse.json({ data: receipt });
}
