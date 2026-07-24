# Diccionario de datos de Creasy

| Campo | Naturaleza | Uso |
|---|---|---|
| `needs` | DECLARED | Correspondencia con necesidades del producto |
| `declaredObligations` | DECLARED | Habilita señales de compra de cartera |
| `consent` | VERIFIED/DECLARED | Control de uso; nunca suma afinidad |
| `incomeRange` | DECLARED | Elegibilidad pendiente; no afinidad |
| `tenureMonths` | DECLARED/VERIFIED | Elegibilidad pendiente; no afinidad |
| `evidence` | OBSERVED | Fuente, fecha, referencia y confianza |
| `sensitiveBlocked` | DERIVED | Excluye la observación del procesamiento |
| `affinityScore` | DERIVED | Correspondencia necesidad-producto, 0–100 |
| `confidence` | DERIVED | Cobertura, calidad y frescura, 0–100 |
| `synthetic` | VERIFIED | Indica que el perfil no corresponde a una persona real |
| `origin` | VERIFIED | Procedencia del caso, incluida autogestión del afiliado |
| `contactRequestedAt` | DECLARED | Fecha en que el afiliado solicitó contacto |
| `guidanceProductIds` | DERIVED | Productos recomendados por el motor al registrar el caso |
| `externalDataStatus` | VERIFIED | Aclara si las fuentes externas no están disponibles en la demo |

Cada `Evidence` conserva `value`, `normalizedValue`, `sourceType`, `sourceName`, `sourceReference`, `capturedAt`, `lastVerifiedAt`, `confidence`, `consentScope`, `dataNature`, `evidenceStatus` y `notes`.
