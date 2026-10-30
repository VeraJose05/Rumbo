// F5 (RNF-03): LLM como juez de las métricas que necesitan juicio. Una llamada por métrica, para
// que una no contamine a la otra, y a ciegas: el juez no sabe el modo ni ve las fuentes. Si los
// lugares existen no lo juzga él: eso lo mide la fidelidad.
import { z, type Genkit } from 'genkit';
import { resumirPerfil } from '../flows/entrevista-logica.js';
import type { Perfil } from '../flows/perfil.js';
import type { Itinerario } from '../flows/planificacion.js';

export const METRICAS_JUEZ = ['relevancia', 'viabilidad'] as const;
export type MetricaJuez = (typeof METRICAS_JUEZ)[number];

// El razonamiento va antes que la nota: el modelo justifica primero y puntúa después.
export const JuicioSchema = z.object({
  razonamiento: z.string(),
  nota: z.number().int().min(1).max(5),
});

export type Juicio = z.infer<typeof JuicioSchema>;

const RUBRICAS: Record<MetricaJuez, { pregunta: string; niveles: string[] }> = {
  relevancia: {
    pregunta: '¿Encaja el plan con lo que pidió el viajero (intereses, compañía, ritmo y presupuesto)?',
    niveles: [
      '5: cubre todos los intereses y todas las actividades son adecuadas para la compañía y el presupuesto.',
      '4: cubre todos los intereses, con alguna actividad poco adecuada para el perfil.',
      '3: cubre solo parte de los intereses o tiene varias actividades que no encajan con el perfil.',
      '2: la mayoría de las actividades no tienen que ver con los intereses del viajero.',
      '1: el plan no tiene nada que ver con lo pedido.',
    ],
  },
  viabilidad: {
    pregunta: '¿Se puede hacer el plan tal como está, en tiempo y distancia?',
    niveles: [
      '5: cada actividad va en una franja lógica (cenar y salir de noche, museos y visitas de día) y los desplazamientos de cada día son razonables.',
      '4: realizable, con algún desplazamiento largo o alguna franja mejorable.',
      '3: tiene algún problema claro, como una actividad nocturna por la mañana o un salto largo entre zonas en la misma franja.',
      '2: varios problemas de horario o de distancia que obligarían a rehacer el plan.',
      '1: no se puede hacer tal como está.',
    ],
  },
};

const FRANJAS = [
  ['manana', 'Mañana'],
  ['tarde', 'Tarde'],
  ['noche', 'Noche'],
] as const;

export function construirPromptJuez(metrica: MetricaJuez, perfil: Perfil, itinerario: Itinerario): { system: string; prompt: string } {
  const { pregunta, niveles } = RUBRICAS[metrica];
  const system = [
    `Eres un evaluador de itinerarios de viaje. Puntúa la ${metrica} del plan de 1 a 5.`,
    pregunta,
    ...niveles,
    'No juzgues si los lugares existen: solo la pregunta anterior.',
    'En "razonamiento" explica en dos o tres frases los motivos y después da la nota.',
  ].join('\n');

  // Solo lugar y descripción: ni citas ni verificación, para que el juez no sepa de qué modo viene.
  const lineas = [`Viaje: ${resumirPerfil(perfil)}`, '', 'Plan:'];
  for (const dia of itinerario.dias) {
    lineas.push(`Día ${dia.dia}`);
    for (const [franja, nombre] of FRANJAS) {
      const actividades = dia[franja].map((a) => `${a.lugar}: ${a.descripcion}`);
      lineas.push(`- ${nombre}: ${actividades.length ? actividades.join(' / ') : 'libre'}`);
    }
  }
  return { system, prompt: lineas.join('\n') };
}

/** Devuelve la función que puntúa un itinerario con el modelo indicado. */
export function definirJuez(ai: Genkit, modelo: string) {
  return async (metrica: MetricaJuez, perfil: Perfil, itinerario: Itinerario): Promise<Juicio> => {
    const { system, prompt } = construirPromptJuez(metrica, perfil, itinerario);
    const { output } = await ai.generate({
      model: modelo,
      system,
      prompt,
      output: { schema: JuicioSchema },
      // Temperatura 0 y semilla fija para que la evaluación sea repetible (RNF-03).
      config: { temperature: 0, seed: 1 },
    });
    if (!output) throw new Error(`El juez no devolvió la ${metrica} con el esquema esperado`);
    return output;
  };
}
