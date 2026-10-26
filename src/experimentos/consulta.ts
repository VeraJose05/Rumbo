// RF-04: consulta directa a Chroma para ver qué fragmentos recupera una pregunta
// (npm run consulta -- "pregunta"). Es la base de la recuperación de F2.
import { cargarConfigChroma } from '../config/chroma.js';
import { cargarConfigModelos } from '../config/modelos.js';
import { crearAi } from '../genkit.js';
import { abrirColeccion } from '../ingest/chroma.js';

const pregunta = process.argv.slice(2).join(' ') || 'quiero ver monumentos';
const destino = process.env.DESTINO || 'Sevilla';
const k = 5;

const configModelos = cargarConfigModelos();
const ai = crearAi(configModelos);
const coleccion = await abrirColeccion(cargarConfigChroma());

// 1. La pregunta se convierte en vector con el mismo modelo que los fragmentos.
const [vector] = await ai.embed({ embedder: `ollama/${configModelos.embedder}`, content: pregunta });

// 2. Chroma devuelve los k vectores más cercanos, solo entre los fragmentos del destino.
const resultado = await coleccion.query({
  queryEmbeddings: [vector!.embedding],
  nResults: k,
  where: { destino },
});

console.log(`Pregunta: «${pregunta}» (destino: ${destino}, k = ${k})\n`);
for (const fila of resultado.rows()[0] ?? []) {
  // Chroma devuelve distancia coseno (0 = idéntico); la pasamos a similitud para compararla con el experimento.
  const similitud = 1 - (fila.distance ?? 1);
  console.log(`${similitud.toFixed(3)}  ${fila.id}  [${fila.metadata?.seccion}]`);
  console.log(`       ${fila.document?.replace(/\s+/g, ' ').slice(0, 110)}…`);
  console.log(`       Fuente: ${fila.metadata?.fuente}, ${fila.metadata?.url} (${fila.metadata?.licencia})\n`);
}
