# Flujos de usuario de Creasy

Creasy presenta dos experiencias conectadas al mismo catálogo y motor de afinidad.

## Afiliado

1. Ingresa a **Encuentra una opción para ti**.
2. Declara su identificador, necesidad, rango de ingreso opcional, situación laboral y antigüedad.
3. Autoriza de forma obligatoria el tratamiento de los datos declarados.
4. Recibe una orientación con producto principal, hasta dos alternativas, explicación, datos utilizados, faltantes y confianza.
5. Puede modificar la información o solicitar contacto de una asesora.

La orientación no consulta fuentes externas reales en el prototipo. Estas aparecen claramente como no disponibles y no se simulan como datos verificados.

## Asesor

El portal conserva dashboard, perfiles, carga masiva, explicabilidad, comparación, revisión humana, auditoría y copiloto. Las solicitudes provenientes del recorrido individual aparecen primero en **Revisión humana**, marcadas como `Autogestión del afiliado`.

Cada caso conserva:

- Consentimiento y fecha.
- Datos declarados durante el recorrido.
- Evidencia con procedencia.
- Recomendaciones calculadas.
- Fecha de solicitud de contacto.

## Límite de la orientación

Creasy recomienda y orienta. La afinidad se mantiene separada de aprobación, elegibilidad, capacidad de pago y evaluación de riesgo.

> Esta orientación muestra los productos con mayor afinidad para tu necesidad. El monto, la tasa y la aprobación están sujetos al estudio de crédito y a la validación de requisitos.
# Recorrido de demostración para jurado

1. Abrir `/demo` y crear una cuenta local de asesor.
2. Comprobar que el nombre, las iniciales y el saludo corresponden a la sesión.
3. Abrir `/demo?view=scenarios`.
4. Comparar tres perfiles sintéticos A, B y C con productos y canales diferentes.
5. Abrir la trazabilidad de un perfil y revisar las señales utilizadas.

## Jurado · Signal Lab

1. Abrir `/demo?view=enrichment&jury=1`.
2. Elegir a Laura (`1010001001`) y pulsar **Enriquecer perfil**.
3. Comparar el perfil estático con el enriquecido.
4. Revisar fuente, referencia, confianza, permiso y estado de cada señal.
5. Leer producto, condición, razón, canal, momento y recibo del puntaje.
6. Pulsar **Activar canal de demo** y comprobar el recibo de WhatsApp.
7. Ejecutar la comparación Laura/Nicolás para ver dos ofertas distintas con el mismo perfil estático.
8. Cambiar a lote, procesar las seis cédulas y descargar el CSV enmascarado.
6. Cerrar sesión y comprobar que es posible volver a entrar con la cuenta creada.
