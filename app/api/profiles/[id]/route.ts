import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = store.get(id);
  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  store.log({ action: "PROFILE_READ", actor: "Asesora demo", detail: `Perfil ${id} consultado` });
  return NextResponse.json({ data: profile });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const patch = await request.json();
  const allowed = { consent: typeof patch.consent === "boolean" ? patch.consent : undefined, needs: Array.isArray(patch.needs) ? patch.needs.slice(0, 12) : undefined };
  const data = store.update(id, Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined)));
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  store.log({ action: patch.consent === false ? "CONSENT_REVOKED" : "PROFILE_UPDATED", actor: "Asesora demo", detail: `Perfil ${id} actualizado` });
  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = store.anonymize(id);
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  store.log({ action: "PROFILE_ANONYMIZED", actor: "Oficial de privacidad demo", detail: `Perfil ${id} anonimizado` });
  return NextResponse.json({ data });
}
