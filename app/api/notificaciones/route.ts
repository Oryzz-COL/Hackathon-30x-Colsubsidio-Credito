import { NextResponse } from "next/server";
import { store } from "@/lib/store";

/**
 * La bandeja de la demostración.
 *
 * Devuelve los correos generados sin su HTML completo salvo que se pida uno
 * concreto: la lista se consulta a menudo y no tiene sentido arrastrar el
 * cuerpo entero de cada mensaje en cada refresco.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const outbox = store.outbox();

  if (id) {
    const message = outbox.find((item) => item.id === id);
    if (!message) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ data: message });
  }

  return NextResponse.json({
    data: outbox.map((message) => ({
      id: message.id,
      profileId: message.profileId,
      audience: message.audience,
      subject: message.subject,
      to: message.to,
      delivery: message.delivery,
      deliveryDetail: message.deliveryDetail,
      createdAt: message.createdAt,
      preview: message.text.slice(0, 180),
    })),
    total: outbox.length,
  });
}
