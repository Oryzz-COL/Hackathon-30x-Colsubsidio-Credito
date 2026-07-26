import { test, expect } from "@playwright/test";

async function useAdvisorSession(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("creasy.advisor.session.v1", JSON.stringify({
      id: "e2e-advisor",
      fullName: "Camila Asesora",
      email: "camila@ejemplo.com",
      role: "Asesoría de crédito",
    }));
  });
}

test("asesor entra con la cuenta de demostración, cierra sesión y vuelve a entrar", async ({ page }) => {
  await page.goto("/demo");
  await page.setViewportSize({ width: 390, height: 844 });
  const accessLogo = page.locator(".access-mobile-brand img");
  await expect(accessLogo).toBeVisible();
  await expect(accessLogo).toHaveAttribute("src", /colsubsidio-logo-amarillo-negro/);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: /Entrar al portal/i }).click();

  await expect(page.getByText("Buenos días, Daniela.")).toBeVisible();
  await expect(page.locator(".top-session").getByText("Daniela Moreno")).toBeVisible();
  const logout = page.getByRole("button", { name: "Cerrar sesión" });
  await expect(logout).toBeVisible();
  await logout.click();

  await expect(page.getByRole("heading", { name: "Entra y prueba Creasy" })).toBeVisible();
  await page.getByRole("button", { name: /Entrar al portal/i }).click();
  await expect(page.getByText("Buenos días, Daniela.")).toBeVisible();
});

test("la demostración directa conserva escenarios, trazabilidad y reinicio", async ({ page }) => {
  await page.goto("/demo?view=scenarios&jury=1");
  await expect(page).toHaveURL(/view=scenarios&jury=1/);
  await expect(page.getByText(/Demostración interactiva · sesión temporal/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Tres personas, tres orientaciones realmente diferentes/i })).toBeVisible();
  await expect(page.locator(".scenario-card")).toHaveCount(3);
  await expect(page.locator(".scenario-signals article")).toHaveCount(9);
  await expect(page.getByText(/confianza 92 %/i).first()).toBeVisible();
  await expect(page.getByText(/revisión humana obligatoria/i).first()).toBeVisible();

  await page.getByRole("button", { name: /Reiniciar casos/i }).click();
  await expect(page.getByText(/datos de ejemplo originales/i)).toBeVisible();
  await page.getByRole("button", { name: /Ver indicadores/i }).click();
  await expect(page.getByRole("tab", { name: "Impacto" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /No prometemos vender más/i })).toBeVisible();
  await expect(page.getByText("4.167", { exact: true })).toBeVisible();
  await expect(page.getByText("5 de 12 meses", { exact: true })).toBeVisible();
  await expect(page.getByText(/Tiempo estimado ahorrado/i)).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo?view=scenarios&jury=1");
  await expect(page.locator(".scenario-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test("recorrido principal de la demo", async ({ page }) => {
  await useAdvisorSession(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Cada afiliado tiene un contexto/i })).toBeVisible();
  await page.getByRole("link", { name: /Abrir Signal Lab/i }).click();
  await expect(page.locator(".top-session").getByText("Camila Asesora")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pulso en vivo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Chispy", exact: true }).click();
  await page.getByRole("tab", { name: "Impacto", exact: true }).click();
  await expect(page.getByText("Beneficios convertidos en capacidad real")).toHaveCount(0);
  await page.getByRole("button", { name: /^Casos/ }).click();
  await expect(page.getByRole("heading", { name: /Personas y decisiones/i })).toBeVisible();
  await page.getByText("Valentina Ríos").first().click();
  await page.getByRole("button", { name: "Ver trazabilidad completa" }).first().click();
  await expect(page.getByText("Mayor correspondencia")).toBeVisible();
  await expect(page.getByText(/No representa una aprobación de crédito/i)).toBeVisible();
});

test("afiliado recibe orientación y envía un caso al portal asesor", async ({ page }) => {
  await useAdvisorSession(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Encuentra una opción para ti/i }).click();
  await expect(page.getByRole("heading", { name: /Encontremos el crédito/i })).toBeVisible();
  await expect(page.locator(".onb-top img")).toHaveAttribute("src", /colsubsidio-logo-amarillo-negro/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Comenzar/i }).click();

  // Paso 1 · necesidad
  await page.getByRole("button", { name: /Educación/i }).click();
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 2 · monto (valor por defecto del simulador)
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 3 · plazo (valor por defecto del simulador)
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 4 · momento
  await page.getByRole("button", { name: /Este mes/i }).click();
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 5 · situación laboral
  await page.getByRole("button", { name: /Categoría A/i }).click();
  await page.getByRole("button", { name: /Contrato indefinido/i }).click();
  await page.getByRole("button", { name: /Pago sin libranza/i }).click();
  await page.getByLabel(/Antigüedad laboral/i).fill("18");
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 6 · hogar (0 personas a cargo por defecto)
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 7 · identidad
  await page.getByLabel(/Nombre completo/i).fill("Valentina Demo");
  await page.getByRole("button", { name: "Mujer", exact: true }).click();
  await page.getByLabel(/Cédula \(opcional\)/i).fill("1020304050");
  await page.getByLabel(/Ciudad/i).selectOption({ label: "Bogotá D.C." });
  await page.getByLabel(/Correo/i).fill("valentina.demo@ejemplo.com");
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 8 · preferencias de contacto
  await page.getByLabel(/Quiero que una asesora/i).check();
  await page.getByRole("button", { name: /Continuar/i }).click();
  // Paso 9 · permisos
  await page.getByRole("button", { name: /Autorizo solo lo necesario/i }).click();
  await page.getByText("Administrar permisos opcionales").click();
  await page.getByRole("checkbox", { name: /^Contacto comercial/i }).check();
  await page.getByRole("button", { name: /Ver mis opciones/i }).click();

  await expect(page.getByText(/Estamos organizando lo que nos contaste/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Vas bien, falta confirmar/i })).toBeVisible();
  await expect(page.getByText(/Producto con mayor afinidad para tu meta/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crédito educativo" })).toBeVisible();
  await expect(page.locator(".verdict header").getByText(/15\.95 % E\.A\..*1\.24 % NMV/i)).toBeVisible();
  await expect(page.getByText(/no es una oferta ni una aprobación/i)).toBeVisible();

  await page.getByRole("button", { name: /Solicitar ayuda de una asesora/i }).click();
  await expect(page.getByRole("heading", { name: /Tu caso quedó listo para revisión humana/i })).toBeVisible();
  await page.getByRole("link", { name: /Ver caso en portal para asesores/i }).click();

  await expect(page.getByRole("heading", { name: /Personas y decisiones, en un solo lugar/i })).toBeVisible();
  await expect(page.getByText("Un caso de este navegador")).toBeVisible();
  const ownCase = page.locator(".inbox-case").filter({ hasText: "Valentina Demo" });
  await expect(ownCase).toHaveCount(1);
  await expect(ownCase.getByText(/Tu recorrido, guardado en este navegador/i)).toBeVisible();
  await expect(ownCase.getByText(/Solicitó acompañamiento/i)).toBeVisible();
});

test("Chispy ocupa el espacio de trabajo y prioriza casos", async ({ page }) => {
  await useAdvisorSession(page);
  await page.goto("/demo?view=assistant");

  await expect(page.getByRole("heading", { name: "¿Qué necesitas resolver?" })).toBeVisible();
  await expect(page.getByLabel("Trabajar sobre")).toBeVisible();
  await expect(page.locator(".chispy-task-list > button")).toHaveCount(4);
  await expect(page.locator(".chispy-chat-card")).toHaveCSS("min-height", "620px");

  await page.getByRole("button", { name: /Priorizar casos/i }).click();
  await expect(page.getByText(/Prioridad sugerida/i)).toBeVisible({ timeout: 20_000 });
});

test("Auditoría genera el resumen sin enviar al usuario a Chispy", async ({ page }) => {
  await useAdvisorSession(page);
  await page.goto("/demo?view=audit");

  await expect(page.getByRole("heading", { name: "Entiende quién hizo qué" })).toBeVisible();
  await page.getByRole("button", { name: "Generar resumen" }).click();
  await expect(page.getByRole("heading", { name: "Resumen listo" })).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/view=audit/);
  await expect(page.getByRole("button", { name: /Copiar/i })).toBeVisible();
});

test("catálogo público muestra únicamente opciones documentadas", async ({ page }) => {
  await page.goto("/orientacion#catalogo");
  await expect(page.locator(".catalog-grid > article")).toHaveCount(8);
  await expect(page.getByText("Libre inversión", { exact: true })).toBeVisible();
  await expect(page.getByText(/Núcleo del reto|Complementario documentado|Pendiente de validación/i)).toHaveCount(0);
  await expect(page.getByAltText("Colsubsidio")).toBeVisible();
});

test("la demo central diferencia tres perfiles, productos y canales", async ({ page }) => {
  await useAdvisorSession(page);
  await page.goto("/demo?view=scenarios");
  await expect(page.getByRole("heading", { name: "Tres personas, tres orientaciones realmente diferentes" })).toBeVisible();
  await expect(page.locator(".scenario-card")).toHaveCount(3);
  await expect(page.getByText("Crédito educativo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Crédito hipotecario", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Crédito Mujer", { exact: true }).first()).toBeVisible();
  const delivery = page.locator(".scenario-delivery");
  await expect(delivery.getByText("WhatsApp", { exact: true })).toBeVisible();
  await expect(delivery.getByText("Portal de Colsubsidio", { exact: true })).toBeVisible();
  await expect(delivery.getByText("Llamada de una asesora", { exact: true })).toBeVisible();
});

test("Signal Lab enriquece una cédula y prueba dos ofertas distintas", async ({ page }) => {
  await page.goto("/demo?view=enrichment&jury=1");
  await expect(page.getByRole("heading", { name: /De una cédula a una oferta/i })).toBeVisible();

  await page.getByRole("button", { name: /Laura/i }).click();
  await page.getByRole("button", { name: /Enriquecer perfil/i }).click();

  await expect(page.getByRole("heading", { name: /El dato nuevo cambia/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crédito educativo", exact: true })).toBeVisible();
  await expect(page.locator(".offer-delivery").getByRole("heading", { name: "WhatsApp", exact: true })).toBeVisible();
  await expect(page.locator(".signal-ledger-list article")).toHaveCount(7);
  await expect(page.locator(".contribution-receipt li")).toHaveCount(6);

  await page.getByRole("button", { name: /Activar canal de demo/i }).click();
  await expect(page.getByText("CANAL ACTIVADO", { exact: true })).toBeVisible();
  await expect(page.getByText(/••• ••• 1001/)).toBeVisible();

  await page.getByRole("button", { name: /Ejecutar comparación/i }).click();
  const comparison = page.locator(".comparison-grid");
  await expect(comparison.getByText("Crédito educativo", { exact: true })).toBeVisible();
  await expect(comparison.getByText("Compra de cartera", { exact: true })).toBeVisible();
});
