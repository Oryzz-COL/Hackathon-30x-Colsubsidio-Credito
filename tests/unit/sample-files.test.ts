/**
 * Los archivos de `public/ejemplos` existen para que alguien pueda descargar un
 * lote de prueba sin ejecutar el proyecto. Como son archivos y no se generan al
 * vuelo, se desincronizan en cuanto cambia la plantilla y nadie se entera hasta
 * que un jurado carga un CSV al que le faltan columnas.
 *
 * Esta prueba los mantiene atados a la constante que usa la aplicación.
 * Para regenerarlos tras cambiar la plantilla:
 *
 *   UPDATE_SAMPLES=1 npx vitest run tests/unit/sample-files.test.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SAMPLE_CSV } from "@/data/profiles";

const CSV_PATH = path.resolve(__dirname, "../../public/ejemplos/perfiles-sinteticos.csv");
const XLSX_PATH = path.resolve(__dirname, "../../public/ejemplos/perfiles-sinteticos.xlsx");
const expected = `${SAMPLE_CSV}\n`;

function regenerate() {
  writeFileSync(CSV_PATH, expected, "utf8");
  const rows = SAMPLE_CSV.split("\n").map((line) => line.split(","));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "perfiles");
  XLSX.writeFile(book, XLSX_PATH);
}

describe("archivos de ejemplo publicados", () => {
  it("coinciden con la plantilla que descarga la aplicación", () => {
    if (process.env.UPDATE_SAMPLES) regenerate();
    expect(readFileSync(CSV_PATH, "utf8")).toBe(expected);
  });

  it("el XLSX tiene las mismas columnas que el CSV", () => {
    const sheet = XLSX.read(readFileSync(XLSX_PATH)).Sheets["perfiles"];
    const [header] = XLSX.utils.sheet_to_json<string[]>(sheet!, { header: 1 });
    expect(header?.join(",")).toBe(SAMPLE_CSV.split("\n")[0]);
  });
});
