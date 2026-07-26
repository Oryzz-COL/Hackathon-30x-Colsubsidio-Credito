/**
 * Traduce el puntaje interno de ordenamiento a un lenguaje prudente para la UI.
 *
 * El número sirve para comparar productos con las mismas reglas, pero mostrarlo
 * como una escala absoluta comunica una certeza que los datos no sostienen.
 */
export function affinityBand(score: number): string {
  if (score >= 80) return "Correspondencia sólida";
  if (score >= 60) return "Correspondencia alta";
  if (score >= 40) return "Correspondencia moderada";
  if (score >= 20) return "Correspondencia inicial";
  return "Señales insuficientes";
}

export function supportingSignalsLabel(count: number): string {
  return `${count} ${count === 1 ? "señal coincidente" : "señales coincidentes"}`;
}
