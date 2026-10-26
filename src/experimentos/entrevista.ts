// RF-01, RF-05: chat de consola de extremo a extremo: entrevista y, con el perfil completo,
// itinerario (npm run entrevista; modo con MODO=C0 o MODO=C1, C1 por defecto).
// Escribe «salir» para terminar antes de tiempo.
import { createInterface } from 'node:readline/promises';
import { MODOS } from '../flows/planificacion.js';
import { entrevistaFlow, planificacionFlow } from '../index.js';
import { mostrarItinerario } from './mostrar.js';

const modo = (process.env.MODO || 'C1') as (typeof MODOS)[number];
if (!MODOS.includes(modo)) throw new Error(`Modo desconocido: ${modo} (usa ${MODOS.join(' o ')})`);

const consola = createInterface({ input: process.stdin, output: process.stdout });

let turno = await entrevistaFlow({ mensaje: '' });
while (!turno.perfil) {
  console.log(`\nRumbo: ${turno.respuesta}`);
  console.log(`        (perfil hasta ahora: ${JSON.stringify(turno.estado.perfil)})`);
  if (turno.respaldo) console.log(`        (guardarraíl: texto de reserva, motivo: ${turno.respaldo})`);
  const mensaje = await consola.question('Tú: ');
  if (mensaje.trim().toLowerCase() === 'salir') break;
  turno = await entrevistaFlow({ estado: turno.estado, mensaje });
}
consola.close();

if (turno.perfil) {
  console.log(`\nRumbo: ${turno.respuesta}`);
  console.log(`\nPreparando tu itinerario (${modo})…`);
  const inicio = performance.now();
  const itinerario = await planificacionFlow({ perfil: turno.perfil, modo });
  mostrarItinerario(turno.perfil, itinerario, (performance.now() - inicio) / 1000);
}
process.exit(0);
