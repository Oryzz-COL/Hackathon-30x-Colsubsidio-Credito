/**
 * Consulta y derechos del titular sobre un perfil de demostración.
 *
 * Las tres operaciones son de solo cálculo. `PATCH` y `DELETE` devuelven cómo
 * quedaría el perfil y dejan que el navegador lo aplique a su propia vista, en
 * lugar de mutar un catálogo que comparten todos los visitantes: cuando sí
 * mutaban, cualquiera podía anonimizar los 36 casos desde la consola y dejarle
 * la demostración en blanco al siguiente que entrara.
 *
 * La revocación y la anonimización se ven igual en pantalla. Lo que cambia es
 * que el efecto es de quien lo pide y no de todo el mundo.
 */

import { NextResponse } from "next/server";
import { publicProfile } from "@/lib/privacy";
import { store } from "@/lib/store";
import type { Profile } from "@/lib/types";

const anonymized = (profile: Profile): Profile => ({
  ...profile,
  fullName: "Titular anonimizado",
  documentNumber: "00000000",
  email: "anonimo@eliminado.test",
  phone: "0000000000",
  needs: [],
  evidence: [],
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = store.get(id);
  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  store.log({ action: "PROFILE_READ", actor: "Asesora demo", detail: `Perfil ${id.slice(0, 8)} consultado` });
  return NextResponse.json({ data: publicProfile(profile) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = store.get(id);
  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const patch = await request.json();
  const allowed = {
    consent: typeof patch.consent === "boolean" ? patch.consent : undefined,
    needs: Array.isArray(patch.needs) ? patch.needs.slice(0, 12) : undefined,
  };
  const data = { ...profile, ...Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined)) };
  store.log({
    action: patch.consent === false ? "CONSENT_REVOKED" : "PROFILE_UPDATED",
    actor: "Asesora demo",
    detail: `Perfil ${id.slice(0, 8)} actualizado`,
  });
  return NextResponse.json({ data: publicProfile(data) });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = store.get(id);
  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  store.log({ action: "PROFILE_ANONYMIZED", actor: "Oficial de privacidad demo", detail: `Perfil ${id.slice(0, 8)} anonimizado` });
  return NextResponse.json({ data: anonymized(profile) });
}
