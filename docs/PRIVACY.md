# Privacidad y habeas data en Creasy

El MVP aplica minimización, finalidad, consentimiento visible, procedencia, frescura, retención configurable y control del titular. Documento, correo y teléfono se enmascaran. Los logs registran IDs y acciones, nunca PII completa.

Separa datos observados, declarados, verificados, derivados e inferidos. Un `LLM_SUMMARY` jamás se convierte automáticamente en `VERIFIED`. Categorías sensibles se bloquean y no llegan al motor.

La revocación bloquea el uso comercial en la demo; exportación, rectificación y eliminación están modeladas. Estos flujos son una simulación y requieren revisión jurídica, contractual y operativa antes de producción bajo Ley 1581 de 2012, Ley 1266 de 2008 y políticas internas.

Prohibido: scraping por cédula, descubrimiento invasivo de contacto, acceso a cuentas, bypass de controles, centrales de riesgo sin autorización, inferencia sensible y uso de ausencia digital como señal negativa.
# Actualización del MVP

Creasy registra autorizaciones independientes para: orientación, personalización con eventos propios, contacto comercial y simulación financiera autorizada. La autorización de orientación no habilita por sí sola contacto ni uso de datos financieros.

Los eventos de comportamiento son exclusivamente de primera parte, se asocian a una finalidad y versión de aviso, se marcan como sintéticos y usan la clase de retención `MVP_30_DAYS`. El prototipo no rastrea actividad externa.

El centro de privacidad permite simular exportación, actualización y revocación. La revocación bloquea el uso comercial posterior.
