# Video demo — 120 segundos

Guion de producción del video demostrativo. La locución se genera con voz sintética;
la imagen es una grabación real del producto desplegado, no una recreación.

Todas las cifras de este guion salieron de una ejecución real del 26 de julio de 2026
sobre <https://creasy-chi.vercel.app>. Si vuelves a grabar en otra fecha, la ventana de
calendario del bloque 5 cambia sola: es el comportamiento correcto, no un error.

## Caso grabado

| Campo | Valor |
|---|---|
| Persona | Valentina Ríos (sintética) |
| Meta | Educación |
| Monto solicitado | $45.000.000 |
| Plazo | 24 meses |
| Categoría | A |
| Vinculación | Contrato indefinido, 18 meses |
| Ingreso declarado | Entre 1 y 2 SMMLV |
| Ciudad | Bogotá D.C. |
| Canal | WhatsApp · lunes a viernes, tarde |

**Resultado del motor:** `NO_VIABLE_HOY` · cuota $2.179.559 = 89 % del ingreso estimado
($2.435.250) · tope por 15 veces el ingreso: $36.528.750 · alternativa viable
$30.700.000 a 60 meses con cuota de $728.588 · tasa 15,95 % E.A. y 1,24 % NMV,
consultada el 26 de julio de 2026 · regla `viabilidad-2026.07.2` · afinidad Crédito educativo
100/100, confianza 72 %.

## Timeline

| # | Tiempo | Duración | Pantalla |
|---|---|---|---|
| 1 | 0:00–0:10 | 10 s | Portada + `/orientacion` |
| 2 | 0:10–0:30 | 20 s | Pasos 1 a 3: meta, monto, plazo con cuota en vivo |
| 3 | 0:30–0:45 | 15 s | Pasos 5 a 9: perfil y consentimientos separados |
| 4 | 0:45–1:10 | 25 s | Resultado: no viable, motivos y escenario alterno |
| 5 | 1:10–1:22 | 12 s | Bloque «Por qué podría ser un buen momento» |
| 6 | 1:22–1:35 | 13 s | Bandeja de casos del portal asesor |
| 7 | 1:35–1:50 | 15 s | Chispy |
| 8 | 1:50–2:00 | 10 s | Impacto honesto + cierre |

## Locución

### Bloque 1 · 0:00–0:10

> Esto es Creasy, funcionando. Una persona busca crédito para estudiar. Nadie va a
> consultar centrales de riesgo, y nadie va a rastrear su vida digital.

**Imagen:** logo sobre fondo azul, corte a `/orientacion`, clic en **Comenzar**.

### Bloque 2 · 0:10–0:30

> Declara su meta: educación. Pide cuarenta y cinco millones. Elige el plazo, y la cuota
> aparece al instante, calculada con la tasa publicada para enero de dos mil veintiséis.
> Todo esto es información que ella entrega, no información que alguien salió a buscar
> sobre ella.

**Imagen:** selección de Educación, deslizador hasta $45.000.000, plazo 24 meses.
Resaltar la tarjeta azul de cuota mensual estimada.

### Bloque 3 · 0:30–0:45

> Su situación laboral, su categoría de afiliación, y el permiso. Cuatro autorizaciones
> separadas por finalidad: orientar, contactar, personalizar y simular. Puede aceptarlas
> todas o decidir una por una.

**Imagen:** paso 5 (categoría A, indefinido, 18 meses), corte al paso 9 desplegando
**Prefiero revisar y elegir permiso por permiso**. Mantener los cuatro consentimientos
en cuadro al menos 3 segundos.

### Bloque 4 · 0:45–1:10

> Y aquí Creasy hace lo que casi ningún sistema hace: decir que no, con respeto. La cuota
> sería el noventa y uno por ciento de su ingreso declarado. Eso no se sostiene. Pero no
> la deja ahí: treinta y tres millones a setenta y dos meses, cuota de setecientos
> veintiocho mil pesos. Eso sí encaja hoy. Y cada motivo trae la regla con la que se
> calculó.

**Imagen:** rótulo **HOY NO ES VIABLE**, zoom a la cuota de $2.179.559 y al 89 %, luego
al bloque azul **Lo que sí podemos hacer hoy**. Cerrar sobre `viabilidad-2026.07.2`.

### Bloque 5 · 1:10–1:22

> Y el momento. Creasy no averiguó nada nuevo sobre ella: sabe que vive en Bogotá y sabe
> qué día es hoy. La ventana de matrículas del segundo semestre cierra en julio.

**Imagen:** bloque **Por qué podría ser un buen momento** con la línea de matrículas y
su fuente. Es el corazón del video: sostener el plano.

### Bloque 6 · 1:22–1:35

> Pide ayuda humana, y el caso entra a la bandeja del asesor con su veredicto y sus
> motivos. La cédula va enmascarada. El contacto queda fuera de franja, porque ella pidió
> que la buscaran en la tarde.

**Imagen:** clic en solicitar asesora, corte a **Bandeja de casos**. Resaltar la fila de
Valentina: `NO VIABLE HOY`, `99••••00`, `Autorizable, fuera de franja`.

### Bloque 7 · 1:35–1:50

> Chispy consulta el catálogo oficial con herramientas, no adivina. Cita la fuente y la
> fecha de cada cifra, enmascara los datos personales en código, y nunca aprueba nada:
> solo explica lo que el motor ya calculó.

**Imagen:** panel de Chispy con «Con herramientas, no con adivinanzas», una pregunta
sobre la tasa de categoría A y las llamadas a herramienta pintándose en vivo.

### Bloque 8 · 1:50–2:00

> Ninguna acción comercial ocurre sin que una persona la apruebe. Creasy no decide por
> Colsubsidio ni por el afiliado: les permite entenderse.

**Imagen:** embudo de impacto honesto, cierre sobre el logo y la URL pública.

## Reglas de grabación

- Nunca mostrar datos reales: el recorrido usa a Valentina Ríos, cédula `1032456789` y
  correo `valentina.rios@ejemplo.com`, todos inventados.
- No acelerar la aparición del resultado: el cálculo es instantáneo y conviene que se vea.
- Mantener el cursor visible y con movimiento suave; nada de saltos.
- Ningún plano por debajo de 2 segundos: el jurado tiene que alcanzar a leer.
