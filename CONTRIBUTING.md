# Contribuir a Creasy

Gracias por ayudar a mejorar Creasy. Este proyecto prioriza explicabilidad, privacidad, reproducibilidad y lenguaje honesto por encima de afirmaciones espectaculares que no puedan verificarse.

## Antes de empezar

- Lee el [README](./README.md), la [arquitectura](./docs/ARCHITECTURE.md) y la [política de seguridad](./SECURITY.md).
- Para una vulnerabilidad usa un [reporte privado](https://github.com/Oryzz-COL/Hackathon-30x-Colsubsidio-Credito/security/advisories/new), no un issue público.
- No añadas información personal real, credenciales, tokens ni archivos `.env`.
- No introduzcas reglas que usen categorías sensibles o que confundan correspondencia con aprobación, riesgo o elegibilidad.

## Preparar el entorno

Requisitos: Node.js 22.13+ (24 LTS recomendado) y pnpm 11.9+.

```bash
git clone https://github.com/Oryzz-COL/Hackathon-30x-Colsubsidio-Credito.git
cd Hackathon-30x-Colsubsidio-Credito
pnpm install --frozen-lockfile
pnpm dev
```

## Proponer un cambio

1. Crea una rama descriptiva desde `main`.
2. Mantén el cambio pequeño y enfocado.
3. Añade o actualiza pruebas cuando cambie el comportamiento.
4. Actualiza contratos y documentación en el mismo PR.
5. Ejecuta las puertas de calidad:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm audit:prod
```

6. Abre un pull request explicando qué cambia, por qué, su impacto y cómo se validó.

## Convenciones

- TypeScript estricto; evita `any` y coerciones silenciosas.
- Validación de entradas en el límite del sistema, preferiblemente con Zod.
- Nombres y textos de interfaz en español claro.
- Commits breves en imperativo o formato convencional: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Comentarios de código para decisiones o restricciones no obvias; evita narrar el historial de desarrollo.
- Sin porcentajes de impacto, conversión o certeza que no tengan línea base y método reproducible.

## Lista de control de privacidad

Todo cambio que toque datos debe responder:

- ¿La finalidad está declarada y autorizada?
- ¿Se usa el mínimo de campos posible?
- ¿La procedencia, vigencia y naturaleza quedan trazadas?
- ¿La respuesta enmascara identificadores?
- ¿Existe una ruta de revocación o exclusión?
- ¿Se mantiene una revisión humana antes de cualquier acción?

## Pull requests

El CI debe quedar en verde. Las revisiones pueden pedir cambios cuando se rompa una garantía de privacidad, trazabilidad, accesibilidad o lenguaje responsable, incluso si la implementación funciona técnicamente.

Al participar aceptas el [Código de conducta](./CODE_OF_CONDUCT.md).
