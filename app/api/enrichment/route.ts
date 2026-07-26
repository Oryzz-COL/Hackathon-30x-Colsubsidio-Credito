import { NextResponse } from "next/server";
import { SIGNAL_LAB_SAMPLE_DOCUMENTS } from "@/data/external-profiles";
import { enrichDocumentBatch } from "@/lib/enrichment/batch";
import { runEnrichment } from "@/lib/enrichment/engine";
import { enrichmentRequestSchema } from "@/lib/enrichment/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    synthetic: true,
    samples: SIGNAL_LAB_SAMPLE_DOCUMENTS,
    notice: "Cédulas y personas ficticias. No se consulta ninguna fuente real.",
  });
}

export async function POST(request: Request) {
  const parsed = enrichmentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: "Solicitud de enriquecimiento inválida.",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }, { status: 400 });
  }

  const { documentNumber, documents, consent } = parsed.data;
  if (documentNumber) {
    return NextResponse.json({
      mode: "SINGLE",
      data: runEnrichment({ documentNumber, consent }),
    });
  }

  return NextResponse.json({
    mode: "BATCH",
    data: enrichDocumentBatch(documents!, consent),
  });
}
