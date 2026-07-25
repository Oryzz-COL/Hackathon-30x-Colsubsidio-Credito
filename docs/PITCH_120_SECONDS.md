# Guion de demostración — 120 segundos

Ruta: `http://localhost:3000/demo` → **Explorar demostración**.

## 0–20 segundos · Problema

“Una categoría de afiliación nos dice parte del contexto, pero no qué necesita una persona hoy. Creasy convierte metas declaradas y señales propias autorizadas en una orientación relevante, explicable y respetuosa.”

Señala el bloque azul inicial. Aclara que todos los datos son sintéticos.

## 20–40 segundos · Solución y controles

“El motor es determinista: valida consentimiento, excluye datos sensibles o no autorizados y calcula afinidad, no aprobación, riesgo ni capacidad de pago. La meta humana aparece antes que el puntaje y toda acción exige revisión humana.”

Señala el rótulo **afinidad** y el control de versión de regla.

## 40–90 segundos · Tres personas

**Valentina:** “Quiere iniciar una especialización. Crédito educativo tiene mayor afinidad; está planeando a tres meses y eligió WhatsApp en la tarde.”

**Samuel:** “Quiere vivienda propia. La orientación cambia a crédito hipotecario, durante la planeación y dentro del portal, sin presión comercial.”

**Laura:** “Quiere fortalecer su emprendimiento. Como declaró género mujer, Crédito Mujer puede corresponder; la necesidad es inmediata y pidió llamada en la mañana.”

En una tarjeta muestra tres señales. Lee su fuente, fecha y confianza; luego señala un faltante y una exclusión.

## 90–100 segundos · Tecnología responsable

“La recomendación sale de reglas versionadas y trazables. Un modelo de lenguaje, si se configura, solo resume el resultado; un fallback local mantiene la demo disponible y nunca decide.”

## 100–120 segundos · Impacto y cierre

Pulsa **Ver impacto honesto**.

“Este embudo cuenta perfiles con señales suficientes, orientación explicable, permiso de contacto, revisiones y bloqueos. No inventamos conversión, ahorro ni colocación. Creasy no decide por Colsubsidio ni por el afiliado: les permite entenderse mejor.”

## Si preguntan

- **¿Usa centrales de riesgo?** No.
- **¿Infiere género por el nombre?** No; solo usa género declarado para validar Crédito Mujer.
- **¿La categoría o edad penalizan?** No; son contexto no adverso.
- **¿Funciona sin IA externa?** Sí; el motor y el fallback son locales.
- **¿Se puede repetir?** Sí; pulsa **Reiniciar casos**.
- **¿Dónde está el afiliado?** En `/orientacion`; no requiere cuenta.
