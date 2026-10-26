// RF-05, RF-09: prompt para generar un día del itinerario. Es el mismo en todos los modos;
// solo cambia si lleva textos recuperados (C1, C2) o no (C0), para que la comparación mida
// el efecto de la recuperación y no el de un prompt distinto.
import { resumirPerfil } from './entrevista-logica.js';
import { actividadesPorDia } from './itinerario.js';
import type { Perfil } from './perfil.js';
import type { FragmentoRecuperado } from './rag.js';

const REGLAS_COMUNES = [
  'Escribe en español el plan de UN día de un viaje, repartido en mañana, tarde y noche.',
  'Pon exactamente el número de actividades que se pide en total; deja vacías las franjas que no uses.',
  'No repitas lugares ya incluidos en días anteriores.',
  'Adapta las actividades a los intereses, la compañía y el presupuesto del viajero.',
  'En "descripcion" escribe una frase breve dirigida al viajero.',
];

const REGLAS_CON_TEXTOS = [
  'Usa SOLO lugares que aparezcan en los textos que te da el usuario; no añadas lugares, precios ni horarios que no estén en ellos.',
  'En "citas" pon los números de los textos de los que sale cada actividad.',
];

export function construirPromptDia({
  perfil,
  dia,
  usados,
  fragmentos,
}: {
  perfil: Perfil;
  dia: number;
  usados: string[];
  /** null en C0: el modelo planifica sin textos recuperados. */
  fragmentos: FragmentoRecuperado[] | null;
}): { system: string; prompt: string } {
  const reglas = fragmentos ? [...REGLAS_COMUNES, ...REGLAS_CON_TEXTOS] : REGLAS_COMUNES;
  const system = `Eres Rumbo, un planificador de viajes.\n${reglas.map((r) => `- ${r}`).join('\n')}`;

  const lineas: string[] = [];
  if (fragmentos) {
    lineas.push('Textos:', ...fragmentos.map((f, i) => `[${i + 1}] (${perfil.destino} › ${f.seccion}) ${f.texto}`), '');
  }
  lineas.push(`Viaje: ${resumirPerfil(perfil)}`);
  lineas.push(`Planifica el día ${dia} de ${perfil.dias} con ${actividadesPorDia(perfil.ritmo)} actividades en total.`);
  if (usados.length) lineas.push(`No repitas estos lugares, ya incluidos en días anteriores: ${usados.join(', ')}.`);

  return { system, prompt: lineas.join('\n') };
}
