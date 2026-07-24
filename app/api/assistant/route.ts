import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWithFallback } from "@/lib/llm/providers";
import { store } from "@/lib/store";

const schema = z.object({ query: z.string().min(2).max(500) });
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (bucket && bucket.resetAt > now && bucket.count >= 30) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  buckets.set(ip, bucket && bucket.resetAt > now ? { ...bucket, count: bucket.count + 1 } : { count: 1, resetAt: now + 60_000 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const { data, provider } = await answerWithFallback(parsed.data.query, store.list());
  store.log({ action: "ASSISTANT_QUERY", actor: "Asesora demo", detail: `Consulta procesada con proveedor ${provider}; texto y PII no almacenados` });
  return NextResponse.json({ data, provider });
}
