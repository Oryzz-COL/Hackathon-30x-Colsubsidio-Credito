# Matriz pública de privacidad y contacto

Esta matriz describe controles de diseño incorporados al prototipo. No certifica cumplimiento legal ni reemplaza la revisión de Colsubsidio.

| Referencia de diseño | Control visible en Creasy | Alcance del MVP |
|---|---|---|
| Ley 1581 de 2012 | Finalidades separadas, acceso, actualización, exportación y revocación simulada | Datos sintéticos; sin tratamiento productivo |
| Decreto 1074 de 2015 | Registro de versión del aviso, fecha, alcance y fuente de cada autorización | Persistencia efímera |
| Ley 1266 de 2008 | Consulta financiera separada y desactivada por defecto | No consulta centrales ni historia crediticia |
| Ley 1328 de 2009 | Información clara, trazabilidad y revisión humana | No aprueba, rechaza ni ofrece condiciones |
| Ley 2300 de 2023 | Política de contacto: lunes a viernes 7:00–19:00; sábado 8:00–15:00; bloqueo en domingos y festivos | Festivos se reciben como señal operativa; requieren calendario oficial |
| Regulación CRC sobre RNE | Marca de exclusión que bloquea contacto comercial | Simulación; no consulta ni modifica el RNE real |
| Circular Externa SIC 002 de 2024 | Minimización, propósito autorizado y eventos propios con retención declarada | Clasificación MVP de 30 días |
| Decreto 368 de 2026 | Referencia pública para futura validación jurídica y operativa | Sin afirmación de certificación |

## Fuentes oficiales

- [Ley 1581 de 2012 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?country=2&i=49981)
- [Decreto 1074 de 2015 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?2.2.2.54.1=&i=76608)
- [Ley 1266 de 2008 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?0=&i=34488)
- [Ley 1328 de 2009 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=36841)
- [Ley 2300 de 2023 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990)
- [Registro de Números Excluidos — compilación CRC](https://normograma.crcom.gov.co/crc/compilacion/docs/resolucion_CRC_5050_2016.htm)
- [Circular Externa 002 de 2024 — SIC](https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos)
- [Decreto 368 de 2026 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=275576)

## Límites

- El conector social existe únicamente como dato sintético autorizado. No ejecuta scraping, no resuelve cuentas por cédula y no infiere categorías sensibles.
- El conector de open finance es sintético y solo participa con la finalidad financiera activa. Un despliegue real requiere proveedor, contrato y autorización expresa.
- El contexto público se aplica a ciudad y fecha, no busca información personal.
- Política de exclusión automática para política, religión, salud, orientación sexual, biometría, origen étnico y cualquier tema sensible.
- La ausencia de huella digital nunca se interpreta como señal adversa.
- Los conectores externos están deshabilitados o identificados como simulación sin consulta real.
- Una solicitud de ayuda crea un caso; no autoriza automáticamente un contacto fuera de las preferencias o franjas permitidas.
- Toda recomendación y siguiente acción requiere revisión humana.

Prototipo diseñado con privacidad desde el diseño y sujeto a validación jurídica, operativa y de riesgo antes de utilizar datos reales o tomar decisiones financieras.
