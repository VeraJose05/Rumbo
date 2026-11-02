// RF-01, RNF-03: pasa las conversaciones de prueba por la entrevista con el viajero simulado y
// guarda una línea por conversación (npm run evaluar:entrevista -- [--solo id1,id2]
// [--salida resultados/entrevista.jsonl]). Cada ejecución sobrescribe el archivo.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { configModelos, entrevistaFlow } from '../index.js';
import { CONVERSACIONES } from './conversaciones.js';
import { versionCodigo } from './entorno.js';
import { compararPerfil, crearViajero, resumir, type RegistroConversacion } from './entrevista-sim.js';

// Una entrevista normal son 3-6 turnos; más de 15 es que se ha atascado.
const MAX_TURNOS = 15;

const argumento = (nombre: string) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const salida = argumento('--salida') ?? 'resultados/entrevista.jsonl';
const solo = argumento('--solo')?.split(',');
const conversaciones = CONVERSACIONES.filter((c) => !solo || solo.includes(c.id));

mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, '');
const commit = versionCodigo();
const registros: RegistroConversacion[] = [];

for (const [i, persona] of conversaciones.entries()) {
  const viajero = crearViajero(persona);
  let turno = await entrevistaFlow({ mensaje: '' });
  const conversacion: RegistroConversacion['conversacion'] = [{ rol: 'rumbo', texto: turno.respuesta }];
  const cuenta = { turnos: 0, repetidas: 0, reservas: 0, contestadasConGuia: 0, preguntasDelViajero: 0, segundos: 0 };
  let anterior: { campo: string; respondeA: string | null; aviso: boolean } | null = null;
  let resultado: ReturnType<typeof compararPerfil> | null = null;

  while (cuenta.turnos < MAX_TURNOS) {
    const campo = turno.estado.preguntados.at(-1) ?? 'destino';
    if (campo === 'confirmacion') {
      resultado = compararPerfil(turno.estado.perfil, persona);
      break;
    }
    // Repetida: vuelve a preguntar lo que el viajero acaba de contestar. No cuenta si el viajero no
    // contestó («hola», una pregunta suya) ni tras avisar de un destino sin guía: ahí repetir es lo correcto.
    if (anterior && anterior.campo === campo && anterior.respondeA === campo && !anterior.aviso) cuenta.repetidas += 1;

    const { texto, esPregunta, respondeA } = viajero.responder(campo);
    conversacion.push({ rol: 'viajero', texto });
    const inicio = performance.now();
    turno = await entrevistaFlow({ estado: turno.estado, mensaje: texto });
    cuenta.segundos += (performance.now() - inicio) / 1000;
    conversacion.push({ rol: 'rumbo', texto: turno.respuesta });

    cuenta.turnos += 1;
    if (turno.respaldo) cuenta.reservas += 1;
    if (esPregunta) {
      cuenta.preguntasDelViajero += 1;
      if (turno.respuesta.includes('](https://es.wikivoyage.org')) cuenta.contestadasConGuia += 1;
    }
    anterior = { campo, respondeA, aviso: turno.respuesta.startsWith('Lo siento, todavía no tengo información') };
  }

  const registro: RegistroConversacion = {
    id: persona.id,
    grupo: persona.grupo,
    llegaAConfirmar: resultado !== null,
    correcto: resultado?.correcto ?? false,
    errores: resultado?.errores ?? [],
    ...cuenta,
    conversacion,
  };
  registros.push(registro);
  appendFileSync(salida, `${JSON.stringify({ ...registro, llm: configModelos.llm, commit, fecha: new Date().toISOString() })}\n`);

  const estado = !registro.llegaAConfirmar ? 'NO LLEGA' : registro.correcto ? 'ok' : `MAL (${registro.errores.map((e) => e.campo).join(', ')})`;
  console.log(
    `[${i + 1}/${conversaciones.length}] ${persona.id.padEnd(28)} ${estado.padEnd(30)} ${registro.turnos} turnos · ` +
      `${registro.repetidas} repetidas · ${registro.reservas} reservas · ${registro.segundos.toFixed(0)} s`,
  );
}

const r = resumir(registros);
const pct = (n: number, de: number) => `${n}/${de} (${Math.round((100 * n) / de)} %)`;
console.log(`
Modelo: ${configModelos.llm} · commit ${commit}
Llegan a confirmar:          ${pct(r.llegan, r.conversaciones)}
Perfil correcto al confirmar: ${pct(r.correctas, r.conversaciones)}
Errores por campo:            ${JSON.stringify(r.erroresPorCampo)}
Turnos por conversación:      ${r.turnosMedios.toFixed(1)}
Preguntas repetidas:          ${r.repetidas}
Textos de reserva:            ${pct(r.reservas, r.turnosTotales)} de los turnos
Preguntas del viajero contestadas con la guía: ${r.contestadasConGuia}/${r.preguntasDelViajero}
Segundos por turno:           ${r.segundosPorTurno.toFixed(1)}`);
process.exit(0);
