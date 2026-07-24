import { test, expect } from "@playwright/test";
test("recorrido principal de la demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Cada afiliado tiene un contexto/i })).toBeVisible();
  await page.getByRole("link", { name: /Portal para asesores/i }).click();
  await expect(page.getByText("Buenos días, Andrea.")).toBeVisible();
  await page.getByRole("button", { name: "Perfiles", exact: true }).click();
  await page.getByText("Valentina Ríos").first().click();
  await expect(page.getByText("Mayor correspondencia")).toBeVisible();
  await expect(page.getByText(/No representa una aprobación de crédito/i)).toBeVisible();
});

test("afiliado recibe orientación y envía un caso al portal asesor", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Encuentra una opción para ti/i }).click();
  await expect(page.getByRole("heading", { name: "Encuentra una opción para ti" })).toBeVisible();

  await page.getByRole("button", { name: /Ver opciones para mí/i }).click();
  await expect(page.getByText(/Debes autorizar el tratamiento/i)).toBeVisible();

  await page.getByLabel(/Cédula o identificador/i).fill("1020304050");
  await page.getByLabel(/Necesidad principal/i).selectOption("educacion");
  await page.getByLabel(/Situación laboral/i).selectOption("indefinido");
  await page.getByLabel(/Antigüedad aproximada/i).fill("18");
  await page.getByLabel(/Autorizo el tratamiento/i).check();
  await page.getByRole("button", { name: /Ver opciones para mí/i }).click();

  await expect(page.getByText(/Estamos organizando tu información/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Esta opción tiene mayor afinidad contigo/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crédito educativo" })).toBeVisible();
  await expect(page.getByText(/El monto, la tasa y la aprobación están sujetos/i)).toBeVisible();

  await page.getByRole("button", { name: /Quiero que me contacte un asesor/i }).click();
  await expect(page.getByRole("heading", { name: /Una asesora ya puede continuar tu caso/i })).toBeVisible();
  await page.getByRole("link", { name: /Ver caso en portal para asesores/i }).click();

  await expect(page.getByRole("heading", { name: /La decisión final siempre tiene contexto/i })).toBeVisible();
  await expect(page.getByText("Autogestión del afiliado").first()).toBeVisible();
  await expect(page.getByText("Contacto solicitado").first()).toBeVisible();
});
