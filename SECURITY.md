# Política de seguridad

La seguridad y la privacidad son requisitos de diseño de Creasy. Agradecemos los reportes responsables que ayuden a proteger el proyecto y a quienes lo evalúan.

## Versiones con soporte

Creasy evoluciona como un prototipo y mantiene una sola línea soportada:

| Versión | Soporte |
|---|---|
| Último commit de `main` | Sí |
| Ramas, forks o despliegues anteriores | No |

## Reportar una vulnerabilidad

No publiques vulnerabilidades, secretos ni datos personales en un issue.

1. Abre un [reporte privado de seguridad](https://github.com/Oryzz-COL/Hackathon-30x-Colsubsidio-Credito/security/advisories/new).
2. Incluye el componente afectado, impacto, pasos mínimos de reproducción y una posible mitigación si la conoces.
3. Usa únicamente datos sintéticos y evita pruebas que degraden el despliegue público o servicios de terceros.

El objetivo del equipo es confirmar la recepción en un máximo de tres días hábiles, validar el hallazgo, acordar una ventana de divulgación y publicar la corrección con el reconocimiento correspondiente, salvo que la persona reportante prefiera permanecer anónima.

## Alcance

Son especialmente relevantes:

- exposición o persistencia inesperada de información personal;
- omisión de controles de consentimiento o autorización;
- inyección, XSS, CSRF, SSRF, traversal o ejecución de código;
- evasión de límites de archivo o de validación;
- filtración de secretos o datos en logs, errores o respuestas;
- manipulación de reglas, auditoría o trazabilidad;
- vulnerabilidades en dependencias con una ruta de explotación aplicable.

Quedan fuera de alcance:

- ingeniería social, phishing o contacto con personas;
- denegación de servicio volumétrica;
- escaneo automatizado agresivo;
- hallazgos que solo afectan navegadores o dependencias sin soporte;
- ausencia de controles productivos que ya esté documentada como límite del prototipo.

## Puerto seguro

Las investigaciones realizadas de buena fe, dentro de este alcance y sin afectar a terceros, serán tratadas como colaboración autorizada. No accedas, modifiques, descargues ni conserves más información de la estrictamente necesaria para demostrar el hallazgo.

## Modelo técnico

Los controles implementados, los límites del prototipo y los requisitos previos a producción están documentados en [docs/SECURITY.md](./docs/SECURITY.md). Para decisiones de privacidad y tratamiento de datos consulta [docs/PRIVACY.md](./docs/PRIVACY.md).
