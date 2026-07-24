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
# Preferencias y autorizaciones granulares

- `preferences.interestedProductIds`: productos seleccionados por el titular.
- `preferences.monthlyPayment`: cuota mensual declarada y opcional.
- `preferences.horizon`: momento declarado para avanzar.
- `preferences.preferredChannel`, `preferredTimeBand`, `maxContactFrequency`: límites elegidos de contacto.
- `consents[]`: finalidad, alcance, versión del aviso, fecha, fuente, estado y canales.
- `behaviorEvents[]`: evento propio, finalidad autorizada, versión, retención y marca sintética.
- `rneExcluded`: exclusión simulada; nunca representa una consulta al RNE real.
- `commercialContactBlocked`: bloqueo explícito de contacto.

# Contexto de afiliación y momentos de vida

- `category`: categoría individual A, B, C o D.
- `addressOrZone`: zona general declarada; no requiere dirección exacta.
- `employerOrSector`, `ageRange`, `dependentsCount`, `childrenAgeRanges`: contexto sociodemográfico sintético.
- `householdStatus`, `housingStatus`: contexto del hogar.
- `declaredGoal`, `lifeEvent`, `goalHorizon`, `estimatedNeedRange`, `urgency`: necesidad y momento declarados.
- `serviceUsage`, `digitalInteractions`, `declaredInterests`: señales sintéticas o de primera parte autorizadas.

La categoría y los atributos sociodemográficos contextualizan la experiencia, pero no generan rechazo, aprobación ni una decisión adversa.
