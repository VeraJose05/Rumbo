// RF-05, RF-09: genera el itinerario de un perfil en cada modo y lo muestra
// (npm run planificar -- '{"destino":"Sevilla","dias":2,"intereses":["naturaleza"]}' [C0|C1]).
import { MODOS, type Itinerario } from '../flows/planificacion.js';
import { actividadesPorDia } from '../flows/itinerario.js';
import { PerfilSchema } from '../flows/perfil.js';
import { planificacionFlow } from '../index.js';

const perfil = PerfilSchema.parse(
  JSON.parse(process.argv[2] ?? '{"destino":"Sevilla","dias":2,"intereses":["monumentos","gastronomia"]}'),
);
const modos = process.argv[3] ? [process.argv[3] as (typeof MODOS)[number]] : [...MODOS];

for (const modo of modos) {
  const inicio = performance.now();
  const itinerario = await planificacionFlow({ perfil, modo });
  const segundos = (performance.now() - inicio) / 1000;
  mostrar(itinerario, segundos);
}
process.exit(0);

function mostrar(itinerario: Itinerario, segundos: number) {
  console.log(`\n════════ ${itinerario.modo} · ${perfil.destino} · ${segundos.toFixed(1)} s ════════`);
  if (!itinerario.hayInformacion) {
    console.log(`No tengo información de ${perfil.destino} para planificar el viaje.`);
    return;
  }
  const esperadas = actividadesPorDia(perfil.ritmo);
  for (const dia of itinerario.dias) {
    const total = dia.manana.length + dia.tarde.length + dia.noche.length;
    console.log(`\nDía ${dia.dia}  (${total} actividades; el ritmo pide ${esperadas})`);
    for (const [franja, actividades] of [['Mañana', dia.manana], ['Tarde', dia.tarde], ['Noche', dia.noche]] as const) {
      for (const a of actividades) {
        const marca = a.verificada === null ? ' ' : a.verificada ? '✓' : '✗';
        const citas = a.citas.length ? ` [${a.citas.join(', ')}]` : '';
        console.log(`  ${marca} ${franja.padEnd(6)} ${a.lugar}${citas}: ${a.descripcion}`);
      }
    }
  }
  const actividades = itinerario.dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche]);
  if (itinerario.fuentes.length) {
    const verificadas = actividades.filter((a) => a.verificada).length;
    console.log(`\nVerificadas: ${verificadas} de ${actividades.length}`);
    console.log('Fuentes:');
    for (const f of itinerario.fuentes) console.log(`  [${f.cita}] ${f.seccion} · ${f.fuente}, ${f.url} (${f.licencia})`);
  }
}
