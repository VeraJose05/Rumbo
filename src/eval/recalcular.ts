// F5 (RNF-03): vuelve a calcular las métricas de un fichero de resultados con el código actual,
// sin llamar al modelo: cada línea guarda el itinerario y los fragmentos recuperados
// (npm run recalcular -- [resultados/evaluacion.jsonl]).
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { cargarConfigChroma } from '../config/chroma.js';
import { PerfilSchema } from '../flows/perfil.js';
import { ItinerarioSchema } from '../flows/planificacion.js';
import { abrirColeccion } from '../ingest/chroma.js';
import { lectorCorpus, versionCodigo } from './entorno.js';
import { metricasItinerario, reverificar } from './metricas.js';

const fichero = process.argv[2] ?? 'resultados/evaluacion.jsonl';
const corpusDe = lectorCorpus(await abrirColeccion(cargarConfigChroma()));
const commitMetricas = versionCodigo();

const lineas = readFileSync(fichero, 'utf8').split('\n').filter(Boolean);
const salida: string[] = [];
for (const linea of lineas) {
  const registro = JSON.parse(linea);
  const perfil = PerfilSchema.parse(registro.perfil);
  const itinerario = reverificar(ItinerarioSchema.parse(registro.itinerario), perfil.destino);
  const metricas = metricasItinerario(itinerario, perfil, await corpusDe(perfil.destino));
  // `commit` sigue siendo el de la generación; `commitMetricas`, el del código que midió.
  salida.push(JSON.stringify({ ...registro, itinerario, metricas, commitMetricas }));
}

// Se escribe aparte y se renombra: si algo falla a mitad, el fichero original queda intacto.
writeFileSync(`${fichero}.tmp`, `${salida.join('\n')}\n`);
renameSync(`${fichero}.tmp`, fichero);
console.log(`${salida.length} ejecuciones recalculadas en ${fichero} (código ${commitMetricas}).`);
process.exit(0);
