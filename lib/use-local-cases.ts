"use client";

import { useSyncExternalStore } from "react";
import { casesSnapshot, serverCasesSnapshot, subscribeToCases, type LocalCase } from "@/lib/demo-case";

/**
 * Los casos que esta persona creó en el recorrido, listos para pintar.
 *
 * Al hidratar devuelve una lista vacía —en el servidor no hay `localStorage`—
 * y en cuanto el navegador toma el control aparece la suya. Guardar o borrar
 * un caso, aquí o en otra pestaña, repinta lo que haga falta y nada más.
 */
export const useLocalCases = (): LocalCase[] =>
  useSyncExternalStore(subscribeToCases, casesSnapshot, serverCasesSnapshot);
