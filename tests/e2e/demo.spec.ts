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
  await expect(page.getByRole("heading", { name: /Encuentra una opción que se parezca/i })).toBeVisible();

  await page.getByLabel(/Nombre completo/i).fill("Valentina Demo");
  await page.getByLabel(/Ciudad o zona/i).fill("Bogotá · Suba");
  await page.getByLabel(/Categoría de afiliación/i).selectOption("A");
  await page.getByLabel(/Cédula o identificador/i).fill("1020304050");
  await page.getByLabel(/Necesidad principal/i).selectOption("educacion");
  await page.getByLabel(/Situación laboral/i).selectOption("indefinido");
  await page.getByLabel(/Antigüedad aproximada/i).fill("18");
  await page.getByRole("button", { name: /Ver opciones para mí/i }).click();
  await expect(page.getByText(/Debes autorizar el uso de los datos/i)).toBeVisible();
  await page.getByLabel(/Orientación con lo que declaré/i).check();
  await page.getByLabel(/Quiero que una asesora/i).check();
  await page.getByLabel(/Contacto comercial/i).check();
  await page.getByRole("button", { name: /Ver opciones para mí/i }).click();

  await expect(page.getByText(/Estamos organizando lo que declaraste/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Esta opción tiene mayor afinidad contigo/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crédito educativo" })).toBeVisible();
  await expect(page.getByText(/no es una oferta ni una aprobación/i)).toBeVisible();

  await page.getByRole("button", { name: /Solicitar ayuda de una asesora/i }).click();
  await expect(page.getByRole("heading", { name: /Tu caso quedó listo para revisión humana/i })).toBeVisible();
  await page.getByRole("link", { name: /Ver caso en portal para asesores/i }).click();

  await expect(page.getByRole("heading", { name: /La decisión final siempre tiene contexto/i })).toBeVisible();
  await expect(page.getByText("Autogestión del afiliado").first()).toBeVisible();
  await expect(page.getByText("Contacto solicitado").first()).toBeVisible();
});

test("catálogo muestra ocho productos y diferencia Libre inversión", async ({ page }) => {
  await page.goto("/orientacion#catalogo");
  await expect(page.locator(".catalog-grid > article")).toHaveCount(8);
  const libre = page.locator(".catalog-grid > article").filter({ hasText: "Libre inversión" });
  await expect(libre).toContainText("Producto adicional");
  await libre.getByText("Ver información disponible").click();
  await expect(libre).toContainText("pendiente de validación con el catálogo oficial vigente");
  await expect(page.getByAltText("Colsubsidio")).toBeVisible();
});

test("la demo central diferencia tres perfiles, productos y canales", async ({ page }) => {
  await page.goto("/demo?view=scenarios");
  await expect(page.getByRole("heading", { name: "Tres personas, tres ofertas realmente diferentes" })).toBeVisible();
  await expect(page.locator(".scenario-card")).toHaveCount(3);
  await expect(page.getByText("Crédito educativo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Crédito hipotecario", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Crédito Mujer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("WhatsApp", { exact: true })).toBeVisible();
  await expect(page.getByText("Portal de Colsubsidio", { exact: true })).toBeVisible();
  await expect(page.getByText("Llamada de una asesora", { exact: true })).toBeVisible();
});
