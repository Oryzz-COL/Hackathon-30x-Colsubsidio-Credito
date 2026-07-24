# Contribuir a Creasy

## Preparación

1. Clona el repositorio.
2. Ejecuta `pnpm install`.
3. Copia `.env.example` a `.env.local` solo si necesitas integraciones externas.
4. Ejecuta `pnpm dev` y comprueba la demo en `http://localhost:3000/demo`.

## Ramas

Parte siempre de `main` actualizado:

```bash
git switch main
git pull --ff-only
git switch -c feature/nombre-corto
```

Usa:

- `feature/nombre-corto` para funcionalidades.
- `fix/nombre-corto` para correcciones.

## Commits

Escribe mensajes breves con Conventional Commits:

```text
feat: add profile comparison
fix: validate empty batch rows
docs: clarify local setup
test: cover consent exclusion
```

No incluyas credenciales, archivos `.env`, datos personales, conversaciones, artefactos de compilación ni documentos internos de planeación.

## Verificación

Antes de abrir un pull request:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ejecuta `pnpm test:e2e` cuando modifiques un recorrido visible.

## Pull requests

1. Sube tu rama.
2. Abre un pull request hacia `main`.
3. Describe qué cambió, por qué y cómo lo verificaste.
4. Mantén cada pull request enfocado en una sola unidad funcional.
5. Espera la revisión antes de fusionar.

