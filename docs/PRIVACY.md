# Privacidad y habeas data en Creasy

El MVP aplica minimización, finalidad, consentimiento visible, procedencia, frescura, retención configurable y control del titular. Documento, correo y teléfono se enmascaran. Los logs registran IDs y acciones, nunca PII completa.

Separa datos observados, declarados, verificados, derivados e inferidos. Un `LLM_SUMMARY` jamás se convierte automáticamente en `VERIFIED`. Categorías sensibles se bloquean y no llegan al motor.

La revocación bloquea el uso comercial en la demo; exportación, rectificación y eliminación están modeladas. Estos flujos son una simulación y requieren revisión jurídica, contractual y operativa antes de producción bajo Ley 1581 de 2012, Ley 1266 de 2008 y políticas internas.

Prohibido: scraping por cédula, descubrimiento invasivo de contacto, acceso a cuentas, bypass de controles, centrales de riesgo, inferencia sensible y uso de ausencia digital como señal negativa.

## Redes sociales y data alternativa

El reto menciona Instagram como ejemplo. Creasy lo representa con `Social Signals · demo autorizada`: datos inventados que simulan una conexión voluntaria. No resuelve un usuario desde la cédula, no descarga fotografías, no analiza seguidores y no usa política, religión, salud, orientación sexual, biometría ni origen étnico.

En producción solo son aceptables dos sustitutos: conexión iniciada por la persona o proveedor autorizado con finalidad, alcance, retención y revocación demostrables. La pantalla muestra el estado excluido para evidenciar que el permiso no es decorativo.

## Sesión del asesor en la demo

Las cuentas creadas para el portal asesor permanecen en el navegador y deben usar información ficticia. La contraseña se deriva con PBKDF2, una sal individual y SHA-256; el valor original no se almacena. La persona puede elegir una sesión temporal o persistente y puede cerrar cualquiera de las dos desde el portal.

Este acceso no equivale a autenticación corporativa ni debe utilizarse con cuentas reales. Un despliegue productivo requiere identidad administrada en servidor, autorización por roles, recuperación segura, rotación de sesiones, registro de accesos y políticas institucionales.

# Actualización del MVP

Creasy registra autorizaciones independientes para: orientación, personalización con eventos propios, contacto comercial y simulación financiera autorizada. La autorización de orientación no habilita por sí sola contacto ni uso de datos financieros.

Los eventos de comportamiento son exclusivamente de primera parte, se asocian a una finalidad y versión de aviso, se marcan como sintéticos y usan la clase de retención `MVP_30_DAYS`. El prototipo no rastrea actividad externa.

El centro de privacidad permite simular exportación, actualización y revocación. La revocación bloquea el uso comercial posterior.
