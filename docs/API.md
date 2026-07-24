# API de Creasy

Todas las respuestas usan JSON. En demo no hay autenticación; producción debe exigir sesión y membresía del workspace.

| Método | Ruta | Función |
|---|---|---|
| GET/POST | `/api/profiles` | Listar y crear perfil |
| GET/PATCH/DELETE | `/api/profiles/:id` | Consultar, actualizar, revocar/anonimizar |
| POST | `/api/affinity/:id` | Calcular los 8 índices |
| POST | `/api/batch` | Validar hasta 2.000 filas |
| POST | `/api/assistant` | Consulta segura con rate limit |
| POST | `/api/speech` | Sintetiza una respuesta anonimizada; fallback local sin clave |
| GET | `/api/audit` | Eventos redactados |

Errores: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `FILE_TOO_LARGE` (413), `RATE_LIMITED` (429). Ningún endpoint devuelve una decisión de aprobación o rechazo.
