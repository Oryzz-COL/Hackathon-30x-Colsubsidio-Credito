import { NextResponse } from "next/server";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { store } from "@/lib/store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = store.get(id);
  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const data = calculateAllAffinities(profile);
  store.log({ action: "AFFINITY_CALCULATED", actor: "Motor de orientación", detail: `Perfil ${id}; regla ${data[0]?.ruleVersion}` });
  return NextResponse.json({ data });
}
