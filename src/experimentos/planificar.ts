// RF-05, RF-09: genera el itinerario de un perfil en cada modo y lo muestra
// (npm run planificar -- '{"destino":"Sevilla","dias":2,"intereses":["naturaleza"]}' [C0|C1]).
import { MODOS } from '../flows/planificacion.js';
import { PerfilSchema } from '../flows/perfil.js';
import { planificacionFlow } from '../index.js';
import { mostrarItinerario } from './mostrar.js';

const perfil = PerfilSchema.parse(
  JSON.parse(process.argv[2] ?? '{"destino":"Sevilla","dias":2,"intereses":["monumentos","gastronomia"]}'),
);
const modos = process.argv[3] ? [process.argv[3] as (typeof MODOS)[number]] : [...MODOS];

for (const modo of modos) {
  const inicio = performance.now();
  const itinerario = await planificacionFlow({ perfil, modo });
  const segundos = (performance.now() - inicio) / 1000;
  mostrarItinerario(perfil, itinerario, segundos);
}
process.exit(0);
