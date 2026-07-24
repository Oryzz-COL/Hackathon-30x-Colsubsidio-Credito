# Arquitectura de Creasy

Next.js App Router ejecuta UI y API en una sola aplicación. `lib/store.ts` ofrece persistencia efímera para demo; el contrato puede reemplazarse por Supabase.

Flujo: entrada → Zod → normalización → clasificación de procedencia → control de consentimiento → exclusión sensible → afinidad determinista → explicación → revisión humana.

El motor usa reglas versionadas y topes por categoría. Los faltantes reducen confianza, no afinidad. Elegibilidad, capacidad de pago y riesgo quedan fuera del índice. Un LLM solo resume resultados ya calculados y toda salida pasa por un esquema Zod con fallback determinista.

Supabase se modela en `db/schema.sql`: UUID, aislamiento por workspace, soft delete, RLS, índices, retención y PII separada/cifrada. Las nuevas configuraciones de Data API de Supabase pueden exigir `GRANT` explícito; deben revisarse al aprovisionar el proyecto.
