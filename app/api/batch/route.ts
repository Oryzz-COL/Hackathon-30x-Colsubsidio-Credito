import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRows } from "@/lib/validation/batch-row";
import { store } from "@/lib/store";

const MAX_ROWS = Number(process.env.MAX_BATCH_ROWS ?? 2000);
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 5_000_000);

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  const body = z.object({ fileName: z.string().max(160).optional(), rows: z.array(z.unknown()).max(MAX_ROWS) }).safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const results = validateRows(body.data.rows);
  const valid = results.filter((r) => r.status === "VALID").length;
  store.log({
    action: "BATCH_IMPORT",
    actor: "Asesora demo",
    detail: `Lote ${body.data.fileName ?? "sin nombre"}: ${results.length} filas, ${valid} válidas, ${results.length - valid} con error (PII no registrada)`,
  });
  return NextResponse.json({
    jobId: crypto.randomUUID(),
    total: results.length,
    valid,
    invalid: results.length - valid,
    results: results.map((result) => ({ row: result.row, status: result.status, errors: result.errors })),
  });
}
