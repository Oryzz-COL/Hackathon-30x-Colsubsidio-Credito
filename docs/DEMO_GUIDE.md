# Guía de demostración

Esta guía permite recorrer el valor central de Creasy de forma reproducible. Todos los datos son sintéticos y la aplicación funciona sin configurar servicios externos.

## Preparación

- Experiencia publicada: <https://creasy-chi.vercel.app>
- Portal asesor: <https://creasy-chi.vercel.app/demo>
- Signal Lab: <https://creasy-chi.vercel.app/demo?view=enrichment&jury=1>
- Cuenta precargada: `asesor@creasy.demo` / `creasy2026`

Para empezar desde cero usa **Reiniciar casos**. Una cédula que no pertenece al catálogo sintético devuelve `NOT_FOUND` y no activa búsquedas externas.

## Recorrido de 120 segundos

1. **0–20 s · Problema:** abre el inicio y explica que categoría y edad no bastan para conocer la necesidad actual de una persona.
2. **20–45 s · Orientación:** entra en `/orientacion`, declara una meta y muestra el producto sugerido, sus alternativas y los datos faltantes.
3. **45–70 s · Viabilidad separada:** prueba un monto exigente y compara el escenario solicitado con la alternativa que podría continuar. Aclara que no es una aprobación.
4. **70–95 s · Handoff:** solicita ayuda y abre el caso en el portal asesor. Revisa consentimiento, canal, horario y siguiente acción.
5. **95–110 s · Evidencia:** abre Signal Lab con `1010001001` y muestra procedencia, fecha, permiso, vigencia y exclusiones.
6. **110–120 s · Cierre:** abre Chispy y pregunta: “¿Por qué orientarías este caso y qué falta revisar?”.

## Qué debe quedar claro

- La correspondencia se comunica en niveles cualitativos, no como una certeza matemática.
- Afinidad, viabilidad preliminar, capacidad de pago y riesgo son conceptos separados.
- Ningún modelo de lenguaje decide; las reglas calculan y Chispy explica.
- Ninguna señal sensible, vencida o no autorizada participa.
- Toda acción conserva revisión humana.

## Comparación controlada

En Signal Lab compara Laura (`1010001001`) con Nicolás (`1010001002`). Comparten el mismo perfil estático relevante, pero sus metas y señales autorizadas producen orientaciones y canales distintos. El ejemplo demuestra personalización sin atribuir el resultado a edad, categoría o género.

## Preguntas frecuentes

**¿Consulta centrales de riesgo?** No.

**¿Busca redes sociales usando una cédula?** No. El conector social es sintético y representa una conexión voluntaria.

**¿La categoría o la edad penalizan?** No. Se usan como contexto no adverso.

**¿Funciona sin IA?** Sí. El motor de reglas y el fallback de Chispy son locales.

**¿Está listo para datos reales?** No. Requiere identidad corporativa, persistencia, cifrado administrado, monitoreo y validación jurídica, financiera y operativa.

Para un guion hablado más detallado consulta [PITCH_120_SECONDS.md](./PITCH_120_SECONDS.md).
