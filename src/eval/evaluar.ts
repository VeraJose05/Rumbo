// F5 (RNF-03, RNF-04): pasa los perfiles de prueba por cada modo y guarda una línea por ejecución
// con todo lo necesario para repetirla y auditarla (npm run evaluar -- [--modos C0,C1]
// [--perfiles sevilla-1,bilbao] [--salida resultados/evaluacion.jsonl]).
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PerfilSchema } from '../flows/perfil.js';
import { almacen, configModelos, planificacionFlow } from '../index.js';
import { leerHechos, parsearArgumentos, pendientes } from './ejecucion.js';
import { lectorCorpus, versionCodigo } from './entorno.js';
import { metricasItinerario } from './metricas.js';
import { PERFILES_PRUEBA } from './perfiles.js';

const argumentos = parsearArgumentos(process.argv.slice(2));
mkdirSync(dirname(argumentos.salida), { recursive: true });
const hechos = existsSync(argumentos.salida) ? leerHechos(readFileSync(argumentos.salida, 'utf8')) : new Set<string>();
const tareas = pendientes(PERFILES_PRUEBA, argumentos.modos, argumentos.perfiles, hechos, configModelos.llm);

const commit = versionCodigo();
const corpusDe = lectorCorpus(almacen);

console.log(`${tareas.length} ejecuciones pendientes (${hechos.size} ya guardadas) → ${argumentos.salida}\n`);
const formato = (valor: number | null) => (valor === null ? '—' : valor.toFixed(2));

for (const [i, { perfil: prueba, modo }] of tareas.entries()) {
  const perfil = PerfilSchema.parse(prueba.perfil);
  const inicio = performance.now();
  const itinerario = await planificacionFlow({ perfil, modo });
  const segundos = (performance.now() - inicio) / 1000;
  const metricas = metricasItinerario(itinerario, perfil, await corpusDe(perfil.destino));

  const registro = {
    perfilId: prueba.id,
    grupo: prueba.grupo,
    modo,
    modelos: configModelos,
    commit,
    fecha: new Date().toISOString(),
    segundos,
    perfil,
    itinerario,
    metricas,
  };
  // Una línea por ejecución, escrita al terminar: si se corta, lo guardado sigue siendo válido.
  appendFileSync(argumentos.salida, `${JSON.stringify(registro)}\n`);

  console.log(
    `[${i + 1}/${tareas.length}] ${prueba.id} ${modo} · ${segundos.toFixed(0)} s · ` +
      (metricas.planificado
        ? `fidelidad ${formato(metricas.fidelidad)}–${formato(metricas.fidelidadLaxa)} · citas ${formato(metricas.coberturaCitas)} · ritmo ${formato(metricas.ritmoCumplido)}`
        : 'sin información (no planifica)'),
  );
}
process.exit(0);
