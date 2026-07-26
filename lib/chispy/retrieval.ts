/**
 * Recuperación léxica sobre la base de conocimiento.
 *
 * Es un BM25 recortado, y es una elección deliberada frente a los embeddings:
 * dieciocho fragmentos no justifican un índice vectorial, un servicio externo
 * ni una llamada de red por consulta. Corre en microsegundos, cuesta cero, da
 * siempre el mismo resultado para la misma pregunta —lo que permite escribirle
 * pruebas— y no depende de que ningún proveedor esté disponible en mitad de la
 * demo. Si algún día la base crece a miles de documentos, este módulo es el
 * único que habría que cambiar.
 */

import { KNOWLEDGE, type KnowledgeChunk } from "@/data/conocimiento";

/** Palabras que aparecen en todas las preguntas y no discriminan nada. */
const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en", "y", "o",
  "que", "es", "son", "para", "por", "con", "sin", "se", "su", "sus", "lo", "le", "me", "mi",
  "cual", "cuales", "como", "cuanto", "cuanta", "cuantos", "cuantas", "cuando", "donde", "quien",
  "hay", "tiene", "tienen", "puedo", "puede", "pueden", "debe", "deben", "ser", "estar", "este",
  "esta", "estos", "estas", "eso", "esa", "ese", "yo", "tu", "si", "no", "mas", "muy", "ya",
]);

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9%]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/** Frecuencia documental de cada término, calculada una vez al cargar el módulo. */
const documentFrequency = (() => {
  const counts = new Map<string, number>();
  for (const chunk of KNOWLEDGE) {
    const seen = new Set(tokenize(`${chunk.title} ${chunk.text} ${chunk.tags.join(" ")}`));
    for (const token of seen) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
})();

const idf = (token: string) => {
  const df = documentFrequency.get(token) ?? 0;
  return Math.log((KNOWLEDGE.length - df + 0.5) / (df + 0.5) + 1);
};

/** Índice precomputado: evita retokenizar la base en cada consulta. */
const INDEX = KNOWLEDGE.map((chunk) => ({
  chunk,
  tokens: tokenize(`${chunk.title} ${chunk.text}`),
  tags: new Set(tokenize(chunk.tags.join(" "))),
  titleTokens: new Set(tokenize(chunk.title)),
}));

const averageLength = INDEX.reduce((sum, item) => sum + item.tokens.length, 0) / Math.max(INDEX.length, 1);

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  score: number;
}

/**
 * Devuelve los fragmentos más pertinentes.
 *
 * Un acierto en la etiqueta o en el título pesa más que uno en el cuerpo:
 * quien pregunta "¿qué tasa me aplican?" quiere el fragmento titulado "Tasas",
 * no el que menciona la palabra de pasada en un párrafo sobre desembolsos.
 */
export function retrieve(query: string, limit = 4): RetrievedChunk[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const k1 = 1.4;
  const b = 0.72;

  return INDEX.map(({ chunk, tokens, tags, titleTokens }) => {
    let score = 0;
    for (const term of terms) {
      const frequency = tokens.filter((token) => token === term).length;
      if (frequency > 0) {
        const denominator = frequency + k1 * (1 - b + (b * tokens.length) / averageLength);
        score += idf(term) * ((frequency * (k1 + 1)) / denominator);
      }
      if (tags.has(term)) score += idf(term) * 1.1;
      if (titleTokens.has(term)) score += idf(term) * 0.7;
    }
    return { chunk, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, limit);
}

/** El contexto que se le entrega al modelo, con la fuente pegada a cada hecho. */
export function formatContext(results: RetrievedChunk[]): string {
  if (results.length === 0) return "No hay fragmentos pertinentes en la base de conocimiento.";
  return results
    .map(({ chunk }) => `[${chunk.id}] ${chunk.title}\n${chunk.text}\nFuente: ${chunk.sourceLabel} (actualizado ${chunk.updatedAt})`)
    .join("\n\n");
}
