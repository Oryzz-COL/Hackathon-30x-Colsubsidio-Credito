# UX V2 · Casos, Chispy y auditoría

## Objetivo

Reducir el esfuerzo que necesita una persona jurado o asesora para entender y
operar Creasy. La interfaz debe mostrar qué hacer antes de explicar cómo está
construida.

## Decisiones

1. **Una sola pantalla de casos**
   - “Perfiles” y “Bandeja de casos” se convierten en **Casos**.
   - La búsqueda, el estado, la trazabilidad y la decisión humana conviven en la
     misma lista.
   - Las rutas antiguas siguen abriendo el espacio unificado para no romper
     enlaces existentes.

2. **Chispy como espacio principal**
   - El chat ocupa toda la altura útil de la aplicación.
   - Las tareas frecuentes aparecen como acciones concretas, no como texto
     explicativo.
   - Se puede seleccionar un caso y pedir resumen, explicación o mensaje sin
     redactar el prompt desde cero.
   - El motor local reconoce intenciones operativas aunque el proveedor externo
     no esté disponible.

3. **Auditoría comprensible**
   - El resumen de Chispy se genera y se muestra dentro de Auditoría.
   - El registro usa nombres legibles, filtros y una línea de tiempo.
   - El CSV permanece como salida secundaria.

4. **Login sin ruido**
   - Se elimina el acceso alternativo superior.
   - Las credenciales demo permanecen precargadas.
   - El titular comunica la propuesta de valor en una sola lectura.

## Criterios de aceptación

- La navegación principal muestra una sola entrada para perfiles y casos.
- Chispy no se percibe como una miniatura a 1280 × 720 ni en móvil.
- “Generar resumen” nunca abandona Auditoría.
- El resumen funciona con el motor local.
- El login no muestra “Conoce Creasy sin registrarte”.
- Build, tipos, lint, pruebas unitarias y E2E quedan en verde.
- La entrega contiene al menos 50 commits reales, PR y merge a `main`.
