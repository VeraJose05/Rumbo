// F5 (RNF-03): puntúa con el LLM juez cada itinerario guardado por `npm run evaluar` y guarda
// un juicio por línea, aparte de los resultados: cambiar de juez no obliga a volver a generar
// (npm run juzgar -- [resultados/evaluacion.jsonl] [resultados/juicios.jsonl]).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { cargarConfigModelos } from '../config/modelos.js';
import { PerfilSchema } from '../flows/perfil.js';
import { ItinerarioSchema } from '../flows/planificacion.js';
import { crearAi } from '../genkit.js';
import { claveDeJuicio, juiciosPendientes, leerHechos } from './ejecucion.js';
import { versionCodigo } from './entorno.js';
import { definirJuez, METRICAS_JUEZ } from './juez.js';

const [resultados = 'resultados/evaluacion.jsonl', salida = 'resultados/juicios.jsonl'] = process.argv.slice(2);
const config = cargarConfigModelos();
const juzgar = definirJuez(crearAi(config), `local/${config.juez}`);
const commit = versionCodigo();

const registros = readFileSync(resultados, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const hechos = existsSync(salida) ? leerHechos(readFileSync(salida, 'utf8'), claveDeJuicio) : new Set<string>();
const tareas = juiciosPendientes(registros, METRICAS_JUEZ, hechos, config.juez);
console.log(`${tareas.length} juicios pendientes con ${config.juez} (${hechos.size} ya guardados) → ${salida}\n`);

for (const [i, { registro, metrica }] of tareas.entries()) {
  const inicio = performance.now();
  const juicio = await juzgar(metrica, PerfilSchema.parse(registro.perfil), ItinerarioSchema.parse(registro.itinerario));
  const segundos = (performance.now() - inicio) / 1000;

  const linea = {
    perfilId: registro.perfilId,
    grupo: registro.grupo,
    modo: registro.modo,
    llm: registro.modelos.llm,
    juez: config.juez,
    metrica,
    ...juicio,
    segundos,
    commit,
    fecha: new Date().toISOString(),
  };
  appendFileSync(salida, `${JSON.stringify(linea)}\n`);
  console.log(`[${i + 1}/${tareas.length}] ${registro.perfilId} ${registro.modo} ${metrica} · ${segundos.toFixed(0)} s · nota ${juicio.nota}`);
}
process.exit(0);
