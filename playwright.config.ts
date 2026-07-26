import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    // El servidor de desarrollo compila rutas bajo demanda y puede consumir casi
    // todo el timeout del primer test en una máquina fría. Probar el artefacto de
    // producción hace el recorrido reproducible y valida lo que se desplegará.
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
