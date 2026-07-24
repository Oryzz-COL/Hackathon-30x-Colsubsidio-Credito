import { test, expect } from "@playwright/test";
test("recorrido principal de la demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Cada afiliado tiene un contexto/i })).toBeVisible();
  await page.getByRole("link", { name: /Entrar a la demo/i }).click();
  await expect(page.getByText("Buenos días, Andrea.")).toBeVisible();
  await page.getByRole("button", { name: "Perfiles", exact: true }).click();
  await page.getByText("Valentina Ríos").first().click();
  await expect(page.getByText("Mayor correspondencia")).toBeVisible();
  await expect(page.getByText(/No representa una aprobación de crédito/i)).toBeVisible();
});
