// RF-07: experimento para calibrar cuándo la guía de un destino no cubre un interés (playas en
// Sevilla). Para cada destino × interés lanza la consulta de la planificación y anota la distancia
// del mejor fragmento (búsqueda vectorial, C1) y la mejor nota del reranker sobre los 20 primeros
// (como C2). Salida: tabla ordenada, resultados/cobertura.json y src/config/cobertura-datos.ts
// (npm run experimento:cobertura).
import { mkdirSync, writeFileSync } from 'node:fs';
import { DESTINOS } from '../config/destinos.js';
import { consultasDelPerfil } from '../flows/consultas.js';
import { INTERESES, type Perfil } from '../flows/perfil.js';
import { coleccion, configModelos, ai } from '../index.js';
import { crearReranker } from '../modelos/reranker.js';

const CANDIDATOS = 20;
const reordenar = crearReranker(configModelos.rerankerUrl);
const filas = [];

for (const destino of DESTINOS) {
  for (const interes of INTERESES) {
    const consulta = consultasDelPerfil({ intereses: [interes] } as Perfil)[1]!.texto;
    const [vector] = await ai.embed({ embedder: `ollama/${configModelos.embedder}`, content: consulta });
    const resultado = await coleccion.query({ queryEmbeddings: [vector!.embedding], nResults: CANDIDATOS, where: { destino: destino.nombre } });
    const candidatos = resultado.rows()[0] ?? [];
    const [mejor] = await reordenar(consulta, candidatos.map((c) => c.document ?? ''), 1);
    const elegido = candidatos[mejor?.indice ?? 0];
    filas.push({
      destino: destino.nombre,
      interes,
      distancia: candidatos[0]?.distance ?? null,
      reranker: mejor?.puntuacion ?? null,
      seccion: String(elegido?.metadata?.seccion ?? ''),
      texto: (elegido?.document ?? '').replace(/\s+/g, ' ').slice(0, 90),
    });
    process.stdout.write('.');
  }
}

filas.sort((a, b) => (b.reranker ?? 0) - (a.reranker ?? 0));
console.log('\n\n| Destino | Interés | Distancia | Reranker | Sección del mejor | Texto |');
console.log('|---|---|---|---|---|---|');
for (const f of filas) {
  console.log(`| ${f.destino} | ${f.interes} | ${f.distancia?.toFixed(3)} | ${f.reranker?.toFixed(3)} | ${f.seccion} | ${f.texto} |`);
}
mkdirSync('resultados', { recursive: true });
writeFileSync('resultados/cobertura.json', JSON.stringify(filas, null, 2));
// Las notas que usa la planificación (src/config/cobertura.ts), en un módulo para no leer JSON en ejecución.
const notas: Record<string, Record<string, number>> = {};
for (const f of filas) (notas[f.destino] ??= {})[f.interes] = Math.round((f.reranker ?? 0) * 1000) / 1000;
writeFileSync(
  'src/config/cobertura-datos.ts',
  `// RF-07: GENERADO por npm run experimento:cobertura; no editar a mano. Nota del reranker del mejor\n` +
    `// fragmento de la guía de cada destino para la consulta de cada interés (0 = la guía no habla de ello).\n` +
    `// Hay que regenerarlo si cambia el corpus.\n` +
    `export const NOTAS_COBERTURA: Record<string, Record<string, number>> = ${JSON.stringify(notas, null, 2)};\n`,
);
process.exit(0);
