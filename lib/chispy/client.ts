export type ChispyStreamEvent =
  | { tipo: "pensando"; texto: string }
  | { tipo: "herramienta"; nombre: string; detalle: string }
  | { tipo: "herramienta_ok"; nombre: string; detalle: string }
  | { tipo: "respuesta"; texto: string; fuentes: string[]; proveedor: string; nota?: string }
  | { tipo: "error"; mensaje: string };

export type ChispyStreamResult = {
  text: string;
  sources: string[];
  provider: string;
  note?: string;
};

export type ChispyAuditSnapshot = {
  id: string;
  action: string;
  actor: string;
  detail: string;
  createdAt: string;
};

export function parseChispyLine(line: string): ChispyStreamEvent | null {
  if (!line.trim()) return null;
  try {
    const event = JSON.parse(line) as Partial<ChispyStreamEvent>;
    if (event.tipo === "pensando" && typeof event.texto === "string") return event as ChispyStreamEvent;
    if (
      (event.tipo === "herramienta" || event.tipo === "herramienta_ok")
      && typeof event.nombre === "string"
      && typeof event.detalle === "string"
    ) return event as ChispyStreamEvent;
    if (
      event.tipo === "respuesta"
      && typeof event.texto === "string"
      && Array.isArray(event.fuentes)
      && typeof event.proveedor === "string"
    ) return event as ChispyStreamEvent;
    if (event.tipo === "error" && typeof event.mensaje === "string") return event as ChispyStreamEvent;
  } catch {
    return null;
  }
  return null;
}

export async function streamChispy(
  query: string,
  onEvent?: (event: ChispyStreamEvent) => void,
  context?: { audit?: ChispyAuditSnapshot[] }
): Promise<ChispyStreamResult> {
  const response = await fetch("/api/chispy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, ...context }),
  });
  if (!response.ok || !response.body) throw new Error(`CHISPY_${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ChispyStreamResult | null = null;

  const consume = (line: string) => {
    const event = parseChispyLine(line);
    if (!event) return;
    onEvent?.(event);
    if (event.tipo === "respuesta") {
      result = {
        text: event.texto,
        sources: event.fuentes,
        provider: event.proveedor,
        note: event.nota,
      };
    } else if (event.tipo === "error") {
      throw new Error(event.mensaje);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(consume);
  }
  if (buffer.trim()) consume(buffer);
  if (!result) throw new Error("CHISPY_EMPTY_RESPONSE");
  return result;
}
