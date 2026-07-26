# API de Creasy

Todas las respuestas usan JSON. En demo no hay autenticación; producción debe exigir sesión y membresía del workspace.

| Método | Ruta | Función |
|---|---|---|
| GET/POST | `/api/profiles` | Listar y crear perfil; registra casos de autogestión autorizados |
| GET/PATCH/DELETE | `/api/profiles/:id` | Consultar, actualizar, revocar/anonimizar |
| POST | `/api/affinity/:id` | Calcular los 8 índices |
| POST | `/api/batch` | Validar hasta 2.000 filas |
| GET/POST | `/api/enrichment` | Listar casos sintéticos o enriquecer una cédula/lote de hasta 2.000 |
| POST | `/api/enrichment/deliver` | Componer y activar la pieza del canal demostrativo |
| POST | `/api/assistant` | Consulta segura con rate limit |
| POST | `/api/speech` | Sintetiza una respuesta anonimizada; fallback local sin clave |
| GET | `/api/audit` | Eventos redactados |

Errores: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `FILE_TOO_LARGE` (413), `RATE_LIMITED` (429). Ningún endpoint devuelve una decisión de aprobación o rechazo.

## Contrato de enriquecimiento

```json
{
  "documentNumber": "1010001001",
  "consent": {
    "socialDemo": true,
    "lifeEvents": true,
    "authorizedFinancial": true,
    "commercialContact": true
  }
}
```

También se acepta `documents` con hasta 2.000 identificadores. La respuesta incluye únicamente documento enmascarado, perfil estático sintético, señales elegibles/excluidas y recomendación explicable. Nunca devuelve correo, teléfono ni cédula completa.
