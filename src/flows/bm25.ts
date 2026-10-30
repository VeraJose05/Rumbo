// RF-04, RF-09 (C2): búsqueda por palabras clave con BM25, la parte léxica de la búsqueda híbrida.
// Complementa a la vectorial, que busca por significado y a veces pierde la palabra exacta
// («playa»). El corpus de cada destino es pequeño (como mucho unos 150 fragmentos), así que el
// índice se construye en memoria.
import { palabras } from './rag.js';

// Palabras tan frecuentes en español que no ayudan a distinguir un fragmento de otro.
const PALABRAS_VACIAS = new Set(
  (
    'a al algo ante con como cual cuando de del desde donde e el ella ellos en entre era es esa ese esta este esto fue ha hay la las le les lo los mas me muy ni no o para pero por que se sea ser si sin sobre son su sus tambien te tiene todo un una uno unos unas y ya'
  ).split(' '),
);

// Parámetros habituales de BM25: k1 limita cuánto suma repetir una palabra; b, cuánto se penaliza la longitud.
const K1 = 1.2;
const B = 0.75;

const terminos = (texto: string) => palabras(texto).filter((p) => !PALABRAS_VACIAS.has(p));

export function crearIndiceBm25(fragmentos: { id: string; texto: string }[]) {
  const docs = fragmentos.map((f) => {
    const frecuencias = new Map<string, number>();
    const lista = terminos(f.texto);
    for (const t of lista) frecuencias.set(t, (frecuencias.get(t) ?? 0) + 1);
    return { id: f.id, frecuencias, longitud: lista.length };
  });
  const longitudMedia = docs.reduce((s, d) => s + d.longitud, 0) / (docs.length || 1);

  // En cuántos fragmentos aparece cada término: cuanto menos, más distingue (idf).
  const apariciones = new Map<string, number>();
  for (const d of docs) for (const t of d.frecuencias.keys()) apariciones.set(t, (apariciones.get(t) ?? 0) + 1);
  const idf = (t: string) => {
    const n = apariciones.get(t) ?? 0;
    return Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
  };

  return {
    /** Los k fragmentos con más puntuación, de mayor a menor; solo los que contienen algún término. */
    buscar(consulta: string, k: number): { id: string; puntuacion: number }[] {
      const consultados = [...new Set(terminos(consulta))];
      return docs
        .map((d) => {
          let puntuacion = 0;
          for (const t of consultados) {
            const tf = d.frecuencias.get(t) ?? 0;
            if (!tf) continue;
            puntuacion += (idf(t) * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.longitud) / longitudMedia));
          }
          return { id: d.id, puntuacion };
        })
        .filter((r) => r.puntuacion > 0)
        .sort((a, b) => b.puntuacion - a.puntuacion)
        .slice(0, k);
    },
  };
}
