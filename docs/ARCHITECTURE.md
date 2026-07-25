# Arquitectura de Creasy

Next.js App Router ejecuta UI y API en una sola aplicación. `lib/store.ts` ofrece persistencia efímera para demo; el contrato puede reemplazarse por Supabase.

Flujo: entrada → Zod → normalización → clasificación de procedencia → control de consentimiento → exclusión sensible → afinidad determinista → explicación → revisión humana.

El motor usa reglas versionadas y topes por categoría. Los faltantes reducen confianza, no afinidad. Elegibilidad, capacidad de pago y riesgo quedan fuera del índice. Un LLM solo resume resultados ya calculados y toda salida pasa por un esquema Zod con fallback determinista.

Supabase se modela en `db/schema.sql`: UUID, aislamiento por workspace, soft delete, RLS, índices, retención y PII separada/cifrada. Las nuevas configuraciones de Data API de Supabase pueden exigir `GRANT` explícito; deben revisarse al aprovisionar el proyecto.
# Personalización explicable

El módulo `lib/personalization.ts` evalúa consentimientos, preferencias, RNE simulado, horario y frecuencia antes de proponer un contacto. La siguiente mejor acción devuelve producto, razones, momento declarado, faltantes, canal y necesidad de revisión humana. Nunca devuelve una decisión de aprobación.

El motor de afinidad separa contribuciones de cinco familias de señales: meta declarada, interacción propia autorizada, uso de servicios, intereses declarados y momento de vida. El canal y el momento se calculan aparte; no son textos fijos ni se deducen únicamente por edad o categoría.

La vista `3 perfiles clave` es una prueba de aceptación funcional: exige tres productos y tres canales diferentes, un mensaje personalizado y al menos tres señales por recomendación.

# Perfil vivo y motor de contexto

`lib/context-engine.ts` transforma eventos propios autorizados en señales temporales. Cada señal conserva producto relacionado, canal, fecha, vencimiento, confianza, finalidad y estado. El motor:

1. Comprueba que exista autorización vigente para personalización comportamental.
2. Excluye eventos vencidos o no autorizados.
3. Reduce el peso según antigüedad.
4. Agrupa señales consistentes por producto.
5. Propone producto, momento, canal y siguiente acción.

La vista `Pulso en vivo` demuestra el cambio desde un perfil con datos básicos y sin recomendación activa hasta una orientación hipotecaria sustentada por tres interacciones propias. El motor de contexto no modifica metas declaradas ni calcula elegibilidad o riesgo.

# Acceso del portal asesor

`components/advisor-access.tsx` implementa el acceso funcional del MVP sin depender de servicios externos:

1. Permite registrar múltiples cuentas locales.
2. Deriva la contraseña con PBKDF2 y una sal aleatoria; no conserva el texto original.
3. Usa `sessionStorage` cuando la persona no desea mantener la sesión.
4. Usa `localStorage` cuando selecciona mantenerla iniciada.
5. Elimina ambos tipos de sesión al cerrar sesión.

Las cuentas locales son una decisión de portabilidad para la demostración pública. En producción, esta capa debe reemplazarse por el proveedor de identidad autorizado, controles de servidor, recuperación de cuenta y políticas corporativas.
