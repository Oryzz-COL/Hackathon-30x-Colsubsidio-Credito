import { NextResponse } from "next/server";
import { z } from "zod";
import { redactText } from "@/lib/privacy";

const schema = z.object({ text: z.string().min(1).max(1200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
    return NextResponse.json({ error: "VOICE_PROVIDER_DISABLED", fallback: "browser" }, { status: 503 });
  }
  const text = redactText(parsed.data.text);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }),
  });
  if (!response.ok) return NextResponse.json({ error: "VOICE_PROVIDER_ERROR" }, { status: 502 });
  return new NextResponse(await response.arrayBuffer(), {
    headers: { "Content-Type": response.headers.get("content-type") || "audio/mpeg", "Cache-Control": "no-store" },
  });
}
