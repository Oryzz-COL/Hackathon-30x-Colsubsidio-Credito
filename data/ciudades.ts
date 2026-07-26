/**
 * Municipios de Colombia para el selector de ciudad.
 *
 * Existe por una razón de calidad de dato, no de comodidad: mientras la ciudad
 * fue un campo de texto libre, la base recibía "bogota", "Bogotá D.C", "bta" y
 * "Bogota - Suba" como cuatro ciudades distintas. Con una lista cerrada, todo
 * lo que entra ya viene normalizado y agrupable.
 *
 * No es el listado completo del DANE (1.100+ municipios): son las capitales de
 * departamento y los municipios de mayor población, que cubren la enorme
 * mayoría de la base afiliada. Ampliarlo es añadir filas aquí.
 */

export interface City {
  name: string;
  department: string;
}

export const CITIES: City[] = [
  { name: "Bogotá D.C.", department: "Bogotá D.C." },
  { name: "Medellín", department: "Antioquia" },
  { name: "Cali", department: "Valle del Cauca" },
  { name: "Barranquilla", department: "Atlántico" },
  { name: "Cartagena", department: "Bolívar" },
  { name: "Cúcuta", department: "Norte de Santander" },
  { name: "Bucaramanga", department: "Santander" },
  { name: "Pereira", department: "Risaralda" },
  { name: "Santa Marta", department: "Magdalena" },
  { name: "Ibagué", department: "Tolima" },
  { name: "Manizales", department: "Caldas" },
  { name: "Villavicencio", department: "Meta" },
  { name: "Pasto", department: "Nariño" },
  { name: "Neiva", department: "Huila" },
  { name: "Armenia", department: "Quindío" },
  { name: "Popayán", department: "Cauca" },
  { name: "Sincelejo", department: "Sucre" },
  { name: "Valledupar", department: "Cesar" },
  { name: "Montería", department: "Córdoba" },
  { name: "Riohacha", department: "La Guajira" },
  { name: "Tunja", department: "Boyacá" },
  { name: "Florencia", department: "Caquetá" },
  { name: "Quibdó", department: "Chocó" },
  { name: "Yopal", department: "Casanare" },
  { name: "Arauca", department: "Arauca" },
  { name: "Mocoa", department: "Putumayo" },
  { name: "San José del Guaviare", department: "Guaviare" },
  { name: "Leticia", department: "Amazonas" },
  { name: "Mitú", department: "Vaupés" },
  { name: "Puerto Carreño", department: "Vichada" },
  { name: "Inírida", department: "Guainía" },
  { name: "San Andrés", department: "San Andrés y Providencia" },
  { name: "Soacha", department: "Cundinamarca" },
  { name: "Chía", department: "Cundinamarca" },
  { name: "Zipaquirá", department: "Cundinamarca" },
  { name: "Facatativá", department: "Cundinamarca" },
  { name: "Fusagasugá", department: "Cundinamarca" },
  { name: "Mosquera", department: "Cundinamarca" },
  { name: "Madrid", department: "Cundinamarca" },
  { name: "Funza", department: "Cundinamarca" },
  { name: "Cajicá", department: "Cundinamarca" },
  { name: "Girardot", department: "Cundinamarca" },
  { name: "Ubaté", department: "Cundinamarca" },
  { name: "La Calera", department: "Cundinamarca" },
  { name: "Sopó", department: "Cundinamarca" },
  { name: "Tocancipá", department: "Cundinamarca" },
  { name: "Bello", department: "Antioquia" },
  { name: "Itagüí", department: "Antioquia" },
  { name: "Envigado", department: "Antioquia" },
  { name: "Sabaneta", department: "Antioquia" },
  { name: "Rionegro", department: "Antioquia" },
  { name: "Apartadó", department: "Antioquia" },
  { name: "Turbo", department: "Antioquia" },
  { name: "Caucasia", department: "Antioquia" },
  { name: "Copacabana", department: "Antioquia" },
  { name: "La Estrella", department: "Antioquia" },
  { name: "Palmira", department: "Valle del Cauca" },
  { name: "Buenaventura", department: "Valle del Cauca" },
  { name: "Tuluá", department: "Valle del Cauca" },
  { name: "Cartago", department: "Valle del Cauca" },
  { name: "Buga", department: "Valle del Cauca" },
  { name: "Jamundí", department: "Valle del Cauca" },
  { name: "Yumbo", department: "Valle del Cauca" },
  { name: "Soledad", department: "Atlántico" },
  { name: "Malambo", department: "Atlántico" },
  { name: "Sabanalarga", department: "Atlántico" },
  { name: "Puerto Colombia", department: "Atlántico" },
  { name: "Floridablanca", department: "Santander" },
  { name: "Girón", department: "Santander" },
  { name: "Piedecuesta", department: "Santander" },
  { name: "Barrancabermeja", department: "Santander" },
  { name: "San Gil", department: "Santander" },
  { name: "Dosquebradas", department: "Risaralda" },
  { name: "Santa Rosa de Cabal", department: "Risaralda" },
  { name: "La Dorada", department: "Caldas" },
  { name: "Chinchiná", department: "Caldas" },
  { name: "Villamaría", department: "Caldas" },
  { name: "Calarcá", department: "Quindío" },
  { name: "Montenegro", department: "Quindío" },
  { name: "Espinal", department: "Tolima" },
  { name: "Melgar", department: "Tolima" },
  { name: "Honda", department: "Tolima" },
  { name: "Pitalito", department: "Huila" },
  { name: "Garzón", department: "Huila" },
  { name: "La Plata", department: "Huila" },
  { name: "Duitama", department: "Boyacá" },
  { name: "Sogamoso", department: "Boyacá" },
  { name: "Chiquinquirá", department: "Boyacá" },
  { name: "Ocaña", department: "Norte de Santander" },
  { name: "Villa del Rosario", department: "Norte de Santander" },
  { name: "Los Patios", department: "Norte de Santander" },
  { name: "Pamplona", department: "Norte de Santander" },
  { name: "Magangué", department: "Bolívar" },
  { name: "Turbaco", department: "Bolívar" },
  { name: "El Carmen de Bolívar", department: "Bolívar" },
  { name: "Ciénaga", department: "Magdalena" },
  { name: "Fundación", department: "Magdalena" },
  { name: "El Banco", department: "Magdalena" },
  { name: "Maicao", department: "La Guajira" },
  { name: "Uribia", department: "La Guajira" },
  { name: "Aguachica", department: "Cesar" },
  { name: "Agustín Codazzi", department: "Cesar" },
  { name: "Lorica", department: "Córdoba" },
  { name: "Cereté", department: "Córdoba" },
  { name: "Sahagún", department: "Córdoba" },
  { name: "Corozal", department: "Sucre" },
  { name: "Tumaco", department: "Nariño" },
  { name: "Ipiales", department: "Nariño" },
  { name: "Túquerres", department: "Nariño" },
  { name: "Santander de Quilichao", department: "Cauca" },
  { name: "Acacías", department: "Meta" },
  { name: "Granada", department: "Meta" },
  { name: "Puerto Gaitán", department: "Meta" },
  { name: "Aguazul", department: "Casanare" },
  { name: "Villanueva", department: "Casanare" },
  { name: "Puerto Asís", department: "Putumayo" },
  { name: "Saravena", department: "Arauca" },
  { name: "Otro municipio", department: "No listado" },
];

/** Etiqueta que se muestra y se guarda: única y agrupable. */
export const cityLabel = (city: City) =>
  city.department === city.name || city.department === "No listado"
    ? city.name
    : `${city.name}, ${city.department}`;

export const CITY_LABELS = CITIES.map(cityLabel);

const CITY_SET = new Set(CITY_LABELS);

export const isKnownCity = (value: string) => CITY_SET.has(value.trim());

/** Municipios agrupados por departamento, para pintar el desplegable. */
export const CITIES_BY_DEPARTMENT = CITIES.reduce<Record<string, City[]>>((groups, city) => {
  (groups[city.department] ??= []).push(city);
  return groups;
}, {});
