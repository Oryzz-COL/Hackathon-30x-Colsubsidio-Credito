# Arquitectura de Creasy

Next.js App Router ejecuta UI y API en una sola aplicación. `lib/store.ts` ofrece persistencia efímera para demo; el contrato puede reemplazarse por Supabase.

Flujo: entrada → Zod → normalización → clasificación de procedencia → control de consentimiento → exclusión sensible → afinidad determinista → explicación → revisión humana.

El motor usa reglas versionadas y topes por categoría. Los faltantes reducen confianza, no afinidad. Elegibilidad, capacidad de pago y riesgo quedan fuera del índice. Un LLM solo resume resultados ya calculados y toda salida pasa por un esquema Zod con fallback determinista.

Supabase se modela en `db/schema.sql`: UUID, aislamiento por workspace, soft delete, RLS, índices, retención y PII separada/cifrada. Las nuevas configuraciones de Data API de Supabase pueden exigir `GRANT` explícito; deben revisarse al aprovisionar el proyecto.
# Personalización explicable

El módulo `lib/personalization.ts` evalúa consentimientos, preferencias, RNE simulado, horario y frecuencia antes de proponer un contacto. La siguiente mejor acción devuelve producto, razones, momento declarado, faltantes, canal y necesidad de revisión humana. Nunca devuelve una decisión de aprobación.

El motor de afinidad separa contribuciones de cinco familias de señales: meta declarada, interacción propia autorizada, uso de servicios, intereses declarados y momento de vida. El canal y el momento se calculan aparte; no son textos fijos ni se deducen únicamente por edad o categoría.

La vista `3 perfiles clave` es una prueba de aceptación funcional: exige tres productos y tres canales diferentes, un mensaje personalizado y al menos tres señales por recomendación.
