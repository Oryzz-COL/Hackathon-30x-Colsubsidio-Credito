/**
 * La base de conocimiento de Chispy.
 *
 * Cada fragmento es un hecho verificable con su fuente y su fecha. No hay
 * paráfrasis creativa: si Colsubsidio publica "mínimo dos (2) meses", aquí dice
 * dos meses. Chispy solo puede responder con lo que está en esta lista, y cita
 * el `sourceLabel` del fragmento que usó — así el jurado puede comprobar cada
 * cifra en lugar de creerse al modelo.
 *
 * Vive en el repositorio y no en una llamada a un portal en tiempo real porque
 * son datos que cambian una vez al año y una llamada de red menos es un modo de
 * fallo menos en mitad de una demo.
 *
 * PARA ACTUALIZAR: las tasas cambian. Revisar las páginas de cada producto en
 * Colsubsidio.com y actualizar `updatedAt` junto con las matrices completas.
 */

export interface KnowledgeChunk {
  id: string;
  title: string;
  /** Términos que deben pesar más que el texto plano al recuperar. */
  tags: string[];
  text: string;
  sourceLabel: string;
  sourceUrl?: string;
  updatedAt: string;
}

export const KNOWLEDGE_VERSION = "conocimiento-colsubsidio-2026.07.26";

export const KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: "requisitos-generales",
    title: "Requisitos generales para acceder a un crédito Colsubsidio",
    tags: ["requisitos", "elegibilidad", "antigüedad", "edad", "ingresos", "documentos", "embargos"],
    text: `Para adquirir productos de crédito con Colsubsidio se exige: estar afiliado a la Caja de Compensación como dependiente, pensionado con aportes o independiente, con la antigüedad mínima requerida según la política de otorgamiento; residir en Colombia; tener entre 18 y 69 años para créditos de consumo y entre 18 y 65 años para crédito hipotecario de vivienda; acreditar ingresos de mínimo 1 SMMLV; no presentar embargos; y que la empresa esté al día en el pago de aportes a la caja. Los dependientes cotizan con aportes del 4 %; independientes, pensionados y facultativos con aportes del 2 %.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "antiguedad-laboral",
    title: "Antigüedad laboral mínima por tipo de vinculación",
    tags: ["antigüedad", "contrato", "indefinido", "término fijo", "independiente", "pensionado", "requisitos"],
    text: `Asalariados con contrato laboral vigente: antigüedad mínima de dos (2) meses si el contrato es a término indefinido, y de seis (6) meses si el contrato es diferente a indefinido. Pensionados: aportes a la caja y antigüedad de afiliación mayor a 6 meses. Independientes: actividad económica vigente, más de 1 año de antigüedad en la labor desarrollada y mínimo un año de afiliación a la caja.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "documentos",
    title: "Documentos que debe presentar el solicitante",
    tags: ["documentos", "cédula", "nómina", "certificado laboral", "papeles", "requisitos"],
    text: `Documentos exigidos: documento de identidad original —no son válidas contraseñas ni documentos distintos al original—, desprendible de nómina del último mes y certificado laboral no mayor a 30 días, ambos según políticas de aprobación de crédito. Si no se adjuntan la certificación laboral y los desprendibles, el análisis se realiza con el salario registrado en el sistema de afiliaciones de Colsubsidio (SAP).`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "montos-plazos",
    title: "Montos y plazos de libre inversión y compra de cartera",
    tags: ["monto", "plazo", "libre inversión", "compra de cartera", "libranza", "smmlv", "máximo"],
    text: `Montos para crédito de libre inversión y compra de cartera: mínimo 1 SMMLV y hasta 150 SMMLV, sin superar 15 veces el ingreso del solicitante. Plazos por modalidad: con libranza, de 6 a 72 meses para libre inversión y compra de cartera; sin libranza, de 6 a 60 meses para ambas líneas. La modalidad de pago es de cuotas fijas mensuales durante todo el plazo.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "tasas",
    title: "Tasas publicadas por producto, categoría y modalidad (consulta 26 de julio de 2026)",
    tags: ["tasa", "tasas", "interes", "libranza", "nomina", "ventanilla", "categoria", "efectiva", "anual", "nmv", "uvr", "pesos", "cupo", "hipotecario", "cuanto", "cobran"],
    text: `Tasas publicadas consultadas el 26 de julio de 2026, expresadas en efectiva anual (E.A.) y nominal mes vencido (NMV). Cambian según el producto, la categoría y, cuando aplica, la modalidad.
LIBRE INVERSIÓN. Con libranza: A 19,19 % E.A. (1,47 % NMV), B 20,09 % (1,54 %), C 20,99 % (1,60 %). Sin libranza: A 21,70 % (1,65 %), B 22,82 % (1,73 %), C 23,94 % (1,80 %) y no afiliado 25,06 % (1,88 %).
COMPRA DE CARTERA. Con libranza: A 15,29 % E.A. (1,19 % NMV), B 16,19 % (1,26 %), C 17,09 % (1,32 %). Sin libranza: A 18,88 % (1,45 %), B 20,00 % (1,53 %), C 21,12 % (1,61 %) y no afiliado 22,24 % (1,69 %).
CUPO DE CRÉDITO, compras generales: A 24,94 % E.A. (1,87 % NMV), B 25,35 % (1,90 %), C 25,76 % (1,93 %). La tasa aplicable es la vigente al momento de cada compra y puede variar según el tipo de transacción.
HIPOTECARIO. Modalidad UVR: A desde 4,39 % E.A. (0,36 % NMV), según la aclaración de la organización de la hackathon; B 5,45 % (0,44 %). Modalidad pesos: A 11,99 % E.A. (0,95 % NMV), B 12,52 % (0,99 %). La página solo publica hipotecario para categorías A y B.
OTROS PRODUCTOS PUBLICADOS. Educativo: A 15,95 % E.A. (1,24 % NMV), B 17,07 % (1,32 %), C 18,19 % (1,40 %) y no afiliado 19,31 % (1,48 %). Crédito Mujer con libranza: A 18,30 % (1,41 %), B 19,20 % (1,47 %), C 20,10 % (1,54 %); sin libranza: A 20,79 % (1,59 %), B 21,91 % (1,66 %), C 23,03 % (1,74 %) y no afiliado 24,15 % (1,82 %). Crédito complementario en pesos: A 12,39 % (0,98 %), B 13,51 % (1,06 %), C 14,63 % (1,14 %) y no afiliado 15,75 % (1,23 %).
Las tasas son una foto trazable para la demo, pueden cambiar y deben confirmarse en Colsubsidio antes de radicar o legalizar una solicitud.`,
    sourceLabel: "Colsubsidio.com · páginas oficiales de cada producto de crédito",
    sourceUrl: "https://www.colsubsidio.com/creditos",
    updatedAt: "2026-07-26",
  },
  {
    id: "cupo-rotativo",
    title: "Cupo de crédito rotativo",
    tags: ["cupo", "rotativo", "tarjeta", "multiservicios", "consumo", "reutilizable"],
    text: `El cupo de crédito de consumo rotativo se usa a través de la tarjeta de afiliación Colsubsidio, es personal e intransferible y tiene validez en Colombia y en el exterior. Es de libre destinación, permite retirar dinero en efectivo y libera recursos a medida que el cliente realiza sus pagos. Está dirigido a todas las categorías de afiliación. Colsubsidio puede expedir cupos amparados: cupos dependientes de un cupo principal a nombre de personas distintas del titular. La garantía es personal (pagaré).`,
    sourceLabel: "Reglamento Cupo de Crédito Rotativo Colsubsidio",
    sourceUrl: "https://transacciones.colsubsidio.com/credito/lineas-de-credito/documentos/reglamento-cupo-credito-10marzo2015.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "rotativo-seguros-impuestos",
    title: "Crédito rotativo para seguros e impuestos",
    tags: ["seguros", "impuestos", "rotativo", "estacional", "predial", "vehículo"],
    text: `El crédito rotativo para seguros e impuestos financia hasta $5.000.000 para impuestos, seguros y gastos inmediatos, con plazos flexibles de hasta 11 meses.`,
    sourceLabel: "Colsubsidio · Crédito rotativo para seguros e impuestos",
    sourceUrl: "https://www.colsubsidio.com/creditos/rotativo",
    updatedAt: "2026-07-25",
  },
  {
    id: "hipotecario",
    title: "Crédito hipotecario de vivienda",
    tags: ["hipotecario", "vivienda", "casa", "apartamento", "cuota inicial", "uvr"],
    text: `El crédito hipotecario financia hasta el 80 % del valor del inmueble, con plazos que van de 5 a 20 años y tasa de interés fija durante toda la vigencia del crédito. Requisitos: afiliación a la caja como empleado, independiente o pensionado con aportes; cédula de ciudadanía colombiana; edad entre 18 y 65 años; ingreso familiar mínimo de 1 SMMLV; no presentar embargos; y empresa al día en aportes.`,
    sourceLabel: "Colsubsidio · Crédito hipotecario",
    sourceUrl: "https://www.colsubsidio.com/creditos/hipotecario",
    updatedAt: "2026-07-25",
  },
  {
    id: "compra-cartera",
    title: "Compra de cartera",
    tags: ["compra de cartera", "consolidar", "deudas", "obligaciones", "unificar"],
    text: `La compra de cartera consolida obligaciones que el afiliado tiene con otras entidades. El desembolso es un giro a terceros: se giran cheques a nombre de cada una de las entidades registradas por el afiliado. Las obligaciones con entidades no vigiladas por la Superintendencia Financiera, o que no cuenten con canales de pago presenciales, no son viables para compra de cartera. Plazos de 6 a 72 meses con libranza y de 6 a 60 meses sin libranza.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "educativo",
    title: "Crédito educativo",
    tags: ["educativo", "educación", "estudio", "matrícula", "posgrado", "pregrado", "técnico", "universidad"],
    text: `El crédito educativo financia formación en instituciones acreditadas, en niveles técnico, pregrado y posgrado, con plazos flexibles. Como toda línea de consumo, exige afiliación vigente, ingresos mínimos de 1 SMMLV y la antigüedad laboral correspondiente al tipo de vinculación. El monto y las condiciones dependen del programa y de la institución, y se confirman en el estudio de crédito.`,
    sourceLabel: "Colsubsidio · Crédito educativo",
    sourceUrl: "https://www.colsubsidio.com/creditos/educativo",
    updatedAt: "2026-07-25",
  },
  {
    id: "credito-mujer",
    title: "Crédito Mujer",
    tags: ["mujer", "emprendimiento", "proyecto productivo", "capital de trabajo"],
    text: `Crédito Mujer acompaña proyectos declarados por mujeres afiliadas con montos adaptables y beneficios adicionales. Las condiciones concretas de monto, tasa y plazo se confirman con el catálogo oficial vigente y el estudio de crédito.`,
    sourceLabel: "Brief del reto de crédito Colsubsidio × 30X",
    updatedAt: "2026-07-25",
  },
  {
    id: "categorias",
    title: "Categorías de afiliación A, B, C y D",
    tags: ["categoría", "afiliación", "smmlv", "ingresos", "clasificación"],
    text: `La categoría de afiliación se asigna según los ingresos del trabajador en SMMLV. Categoría A: hasta 2 SMMLV. Categoría B: más de 2 y hasta 4 SMMLV. Categoría C: más de 4 SMMLV. Categoría D se usa en este prototipo para personas no afiliadas. Los trabajadores independientes y contratistas que aportan el 0,6 % y sus beneficiarios quedan en categoría B, según el Decreto 1072 de 2015. La categoría determina la tasa que se aplica, pero no se usa como criterio adverso: no reduce la afinidad de un producto ni descalifica a nadie por sí sola.`,
    sourceLabel: "Colsubsidio · Centro de ayuda, categorías de afiliación",
    sourceUrl: "https://ayuda.colsubsidio.com/cual-es-categoria-afiliacion",
    updatedAt: "2026-07-25",
  },
  {
    id: "tiempos-respuesta",
    title: "Tiempos de respuesta y notificación",
    tags: ["tiempo", "respuesta", "aprobación", "cuánto tarda", "notificación", "estudio"],
    text: `El tiempo de respuesta para el estudio y aprobación de crédito de consumo, libre inversión e hipotecario es de hasta tres (3) días hábiles contados desde la radicación de la documentación completa. En jornadas de temporada escolar, el cupo de crédito puede resolverse en dos horas. La notificación se hace por mensaje de texto o por el canal que Colsubsidio destine. La línea de servicio al cliente es 7457900, opción 2-2. Toda aprobación está sujeta a estudio de crédito y al cumplimiento de las políticas de otorgamiento.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "pagos-garantias",
    title: "Formas de pago, garantías y desembolso",
    tags: ["pago", "cuota", "libranza", "nómina", "garantía", "pagaré", "codeudor", "desembolso"],
    text: `Las líneas de crédito se pagan en cuotas fijas mensuales. El pago puede hacerse por descuento de nómina cuando el afiliado trabaja en una empresa con convenio de libranza, o por ventanilla a través del portal transaccional, link de pagos, la billetera digital Mi Colsubsidio, oficinas de Efecty y PagaTodo, y Banco Davivienda. Para libre inversión y compra de cartera puede requerirse garantía personal (pagaré) o codeudor; para el cupo de crédito, garantía personal. El desembolso de libre inversión se gira a la cuenta registrada por el afiliado. Firmar la libranza no obliga a Colsubsidio a aprobar la solicitud.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "seguros-aliados",
    title: "Seguros y asistencias con aliados",
    tags: ["seguro", "vida", "exequial", "asistencia", "bolívar", "recordar", "gea"],
    text: `Colsubsidio comercializa seguros y asistencias con aliados: Seguros Bolívar para seguro de vida, Grupo Recordar para previsión exequial y GEA para asistencias. Colsubsidio actúa como medio de pago y canal de comercialización; el producto lo presta la aseguradora aliada.`,
    sourceLabel: "Reglamento Actividad de Crédito Social y Seguros Colsubsidio, enero 2026",
    sourceUrl: "https://cms.colsubsidio.com/sites/default/files/Documentos/colsubsidio/2025/reglamento-feria-escolar-creditos-y-seguros-enero-2026.pdf",
    updatedAt: "2026-01-09",
  },
  {
    id: "habeas-data",
    title: "Tratamiento de datos personales en Colombia",
    tags: ["datos", "privacidad", "habeas data", "ley 1581", "autorización", "consentimiento", "rne"],
    text: `La Ley 1581 de 2012 exige autorización previa, expresa e informada del titular para tratar sus datos personales, y en Colombia no existe la figura del interés legítimo del RGPD europeo. El titular puede conocer, actualizar, rectificar y revocar la autorización. El Registro Nacional de Excluidos (RNE) permite a una persona pedir que no la contacten con fines comerciales. Los datos sensibles tienen protección reforzada y su tratamiento requiere autorización explícita, salvo excepciones legales. Creasy aplica estas reglas: sin autorización vigente no se activa contacto comercial.`,
    sourceLabel: "Ley 1581 de 2012 · Régimen colombiano de protección de datos",
    updatedAt: "2026-07-25",
  },
  {
    id: "calendario-exogeno",
    title: "Ventanas de calendario que cambian el momento de una oferta",
    tags: ["calendario", "momento", "cuando", "matricula", "predial", "impuesto", "prima", "temporada escolar", "estacional"],
    text: `Creasy cruza la ciudad declarada con un calendario público para saber cuándo una oferta es oportuna. Ventanas modeladas: matrículas de educación superior del primer semestre (noviembre a febrero) y del segundo (mayo a julio); temporada escolar (diciembre y enero), reconocida en el propio reglamento de Colsubsidio, en la que el cupo de crédito puede resolverse en dos horas; impuesto predial de Bogotá (marzo a junio, según el calendario tributario de la Secretaría de Hacienda Distrital) y predial de municipios de Cundinamarca (febrero a mayo, según lo que publique cada alcaldía); y prima legal de servicios, que se paga a más tardar el 30 de junio y el 20 de diciembre según el artículo 306 del Código Sustantivo del Trabajo. Salvo la prima, que tiene fecha legal exacta, las ventanas tienen precisión de mes: la fecha puntual la publica cada entidad cada año. Una ventana abierta no convierte a nadie en candidato; solo cambia el momento de quien ya declaró esa necesidad.`,
    sourceLabel: "Creasy · Motor de calendario exógeno, versión calendario-exogeno-2026.07",
    updatedAt: "2026-07-26",
  },
  {
    id: "limites-creasy",
    title: "Qué hace y qué no hace Creasy",
    tags: ["creasy", "alcance", "límites", "aprobación", "riesgo", "buró", "datacrédito"],
    text: `Creasy calcula afinidad entre necesidades declaradas y productos, y una viabilidad preliminar sobre datos declarados. No consulta centrales de riesgo como DataCrédito o TransUnion, no verifica ingresos contra fuentes oficiales, no calcula riesgo crediticio y no aprueba ni rechaza créditos: toda decisión final corresponde al estudio de crédito de Colsubsidio y a una persona. Creasy tampoco usa la edad, la categoría de afiliación ni el género como criterio adverso; el género declarado solo se usa para verificar la correspondencia de Crédito Mujer y nunca se infiere a partir del nombre.`,
    sourceLabel: "Creasy · Política de alcance del prototipo",
    updatedAt: "2026-07-25",
  },
];
