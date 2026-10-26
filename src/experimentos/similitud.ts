// RF-03, RF-04: experimento para entender los embeddings antes de montar la base vectorial.
// Trocea el artículo de Sevilla, calcula el embedding de cada fragmento y de la pregunta,
// y muestra qué fragmentos se parecen más (npm run experimento:similitud -- "pregunta").
import { readFileSync } from 'node:fs';
import { cargarConfigModelos } from '../config/modelos.js';
import { crearAi } from '../genkit.js';
import { TROCEADO_POR_DEFECTO, textoConContexto, trocearArticulo } from '../ingest/troceado.js';
import { limpiarWikitexto } from '../ingest/wikitexto.js';

const pregunta = process.argv.slice(2).join(' ') || 'quiero ver monumentos';

const config = cargarConfigModelos();
const ai = crearAi(config);
const embedder = `ollama/${config.embedder}`;

const wikitexto = JSON.parse(readFileSync('data/exploracion/sevilla-wikivoyage.json', 'utf8')).parse.wikitext;
const fragmentos = trocearArticulo(limpiarWikitexto(wikitexto), TROCEADO_POR_DEFECTO);

// Un embedding es una lista de números (1024 con bge-m3) que resume el significado del texto.
const [vectorPregunta] = await ai.embed({ embedder, content: pregunta });
// Dos versiones de cada fragmento: el texto tal cual, y con «Sevilla › Sección:» delante.
const vectoresSinContexto = await ai.embedMany({ embedder, content: fragmentos.map((f) => f.texto) });
const vectoresConContexto = await ai.embedMany({
  embedder,
  content: fragmentos.map((f) => textoConContexto('Sevilla', f)),
});

console.log(`Pregunta: «${pregunta}»`);
console.log(`Su embedding empieza así: [${vectorPregunta!.embedding.slice(0, 5).map((n) => n.toFixed(3)).join(', ')}, …] (${vectorPregunta!.embedding.length} números)`);

mostrarRanking('Sin contexto (solo el texto del fragmento)', vectoresSinContexto);
mostrarRanking('Con contexto («Sevilla › Sección: texto»)', vectoresConContexto);

function mostrarRanking(titulo: string, vectores: { embedding: number[] }[]) {
  const ranking = fragmentos
    .map((fragmento, i) => ({ fragmento, similitud: similitudCoseno(vectorPregunta!.embedding, vectores[i]!.embedding) }))
    .sort((a, b) => b.similitud - a.similitud);

  console.log(`\n${titulo}. Los 5 más parecidos:`);
  for (const { fragmento, similitud } of ranking.slice(0, 5)) {
    console.log(`  ${similitud.toFixed(3)}  ${fragmento.seccion.join(' › ').padEnd(28)} ${fragmento.texto.replace(/\s+/g, ' ').slice(0, 60)}…`);
  }
}

/**
 * Similitud coseno: mide si dos vectores «apuntan en la misma dirección».
 * 1 = mismo significado, cerca de 0 = nada que ver. Es lo que calculará Chroma por dentro.
 */
function similitudCoseno(a: number[], b: number[]): number {
  let producto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    producto += a[i]! * b[i]!;
    normaA += a[i]! * a[i]!;
    normaB += b[i]! * b[i]!;
  }
  return producto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}
