// RF-05: muestra un itinerario en la consola, con la verificación de cada actividad.
import { actividadesPorDia } from '../flows/itinerario.js';
import type { Perfil } from '../flows/perfil.js';
import type { Itinerario } from '../flows/planificacion.js';

const MARCAS = { verificada: '✓', 'cita-erronea': '~', 'sin-fuente': '✗' } as const;

export function mostrarItinerario(perfil: Perfil, itinerario: Itinerario, segundos: number) {
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
        const marca = a.verificacion ? MARCAS[a.verificacion] : ' ';
        const citas = a.citas.length ? ` [${a.citas.join(', ')}]` : '';
        console.log(`  ${marca} ${franja.padEnd(6)} ${a.lugar}${citas}: ${a.descripcion}`);
      }
    }
  }
  const actividades = itinerario.dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche]);
  if (itinerario.fuentes.length) {
    const cuenta = (v: string) => actividades.filter((a) => a.verificacion === v).length;
    console.log(
      `\n✓ verificadas: ${cuenta('verificada')} · ~ cita errónea: ${cuenta('cita-erronea')} · ` +
        `✗ sin fuente: ${cuenta('sin-fuente')} (de ${actividades.length})`,
    );
    console.log('Fuentes:');
    for (const f of itinerario.fuentes) console.log(`  [${f.cita}] ${f.seccion} · ${f.fuente}, ${f.url} (${f.licencia})`);
  }
}
