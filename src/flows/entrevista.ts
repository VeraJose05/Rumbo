// RF-01: flow de entrevista. Cada llamada es un turno: recibe el estado y el mensaje del viajero
// y devuelve el estado nuevo y lo que responde Rumbo. El código decide qué preguntar y cuándo
// terminar; el LLM extrae datos del mensaje y redacta la pregunta con naturalidad, y un
// guardarraíl comprueba lo que redacta antes de enseñarlo.
import { z, type Genkit } from 'genkit';
import { DESTINOS } from '../config/destinos.js';
import {
  avisoDestino,
  ETIQUETAS_INTERES,
  fusionarPerfil,
  listaDestinos,
  resumirPerfil,
  siguientePaso,
  type EstadoEntrevista,
} from './entrevista-logica.js';
import { validarMensaje } from './guardarrail.js';
import { COMPANIAS, INTERESES, PerfilSchema, PRESUPUESTOS, RITMOS } from './perfil.js';

const EstadoSchema = z.object({
  perfil: z.record(z.string(), z.unknown()),
  preguntados: z.array(z.string()),
});

export const EntrevistaEntradaSchema = z.object({
  /** Sin estado empieza una entrevista nueva. */
  estado: EstadoSchema.optional(),
  mensaje: z.string(),
});

export const EntrevistaSalidaSchema = z.object({
  estado: EstadoSchema,
  respuesta: z.string(),
  /** El perfil completo y validado cuando la entrevista termina; null mientras tanto. */
  perfil: PerfilSchema.nullable(),
  /** Por qué se descartó el texto del modelo y se usó el de reserva; null si no hizo falta. */
  respaldo: z.string().nullable(),
});

// Todos los campos están siempre presentes (null si el mensaje no lo dice): con salida restringida
// el modelo tiene que pronunciarse sobre cada uno en vez de saltárselos.
const ExtraccionSchema = z.object({
  destino: z.string().nullable(),
  dias: z.number().int().nullable(),
  intereses: z.array(z.enum(INTERESES)),
  ritmo: z.enum(RITMOS).nullable(),
  presupuesto: z.enum(PRESUPUESTOS).nullable(),
  compania: z.enum(COMPANIAS).nullable(),
});

// Con un modelo pequeño hay que insistir en no deducir: en las pruebas rellenaba intereses
// («museos, gastronomía») a partir de un simple «me apetece Granada».
const SISTEMA_EXTRACCION = `Extraes datos de viaje del mensaje de un viajero. Copia solo lo que el mensaje dice de forma explícita; no deduzcas ni completes. Si un dato no aparece, pon null (o lista vacía en intereses).
- destino: solo el nombre de la ciudad o el lugar al que viaja, sin preposiciones («A Japón» → «Japón»).
- dias: número de días del viaje («un fin de semana» son 2).
- intereses: solo si el viajero habla de lo que le gusta o quiere hacer; elige de esta lista: ${INTERESES.join(', ')}. Decir con quién viaja no es un interés.
- ritmo: solo si habla del ritmo o la intensidad del viaje (tranquilo, normal o intenso).
- presupuesto: solo si habla de dinero (bajo, medio o alto).
- compania: solo, pareja, familia (con hijos o familiares) o amigos.`;

type Campo = 'destino' | 'dias' | 'intereses' | 'opcionales';

// Para cada pregunta: qué tiene que preguntar el modelo, el texto de reserva si su redacción no pasa
// el guardarraíl, y las opciones, que añade siempre el código porque el modelo las recortaba
// (ofrecía dos de los ocho intereses).
function pregunta(campo: Campo, destino: unknown): { objetivo: string; reserva: string; opciones: string } {
  switch (campo) {
    case 'destino':
      return {
        objetivo: 'a dónde quiere viajar',
        reserva: '¿A dónde quieres ir?',
        opciones: `Puedo ayudarte con ${listaDestinos()}.`,
      };
    case 'dias':
      return {
        objetivo: `cuántos días va a estar en ${destino}`,
        reserva: `¿Cuántos días vas a estar en ${destino}?`,
        opciones: 'Puedo planificar de 1 a 7.',
      };
    case 'intereses':
      return {
        objetivo: `qué le gustaría hacer en ${destino}`,
        reserva: `¿Qué te gustaría hacer en ${destino}?`,
        opciones: `Puedes elegir varios: ${Object.values(ETIQUETAS_INTERES).join(', ')}.`,
      };
    case 'opcionales':
      return {
        objetivo: 'si quiere contar algo más del viaje (es opcional)',
        reserva: '¿Quieres contarme algo más?',
        opciones:
          'Por ejemplo, con quién viajas (solo, en pareja, en familia o con amigos), qué ritmo prefieres ' +
          '(tranquilo, normal o intenso) o tu presupuesto (bajo, medio o alto). Si no, dime «nada más».',
      };
  }
}

const SISTEMA_PREGUNTA = `Eres Rumbo, un asistente que ayuda a planificar viajes. Hablas en español, con un tono cercano y natural.
Escribe tu siguiente mensaje al viajero: una reacción breve a lo que acaba de decir (o un saludo si es el inicio) y la pregunta que se te indica.
- Tutea al viajero y no le llames por ningún nombre.
- Saluda solo si es el inicio de la conversación.
- Como mucho dos frases cortas, y la segunda es una pregunta.
- No menciones ningún lugar, destino ni recomendación que el viajero no haya dicho.
- No enumeres opciones: se añaden después.`;

export function definirEntrevistaFlow(ai: Genkit) {
  return ai.defineFlow(
    { name: 'entrevistaFlow', inputSchema: EntrevistaEntradaSchema, outputSchema: EntrevistaSalidaSchema },
    async ({ estado: estadoPrevio, mensaje }) => {
      let estado: EstadoEntrevista = estadoPrevio ?? { perfil: {}, preguntados: [] };

      // 1. Extraer datos del mensaje, sabiendo qué se le había preguntado.
      if (mensaje.trim()) {
        const preguntado = siguientePaso(estado);
        const campoPreguntado = preguntado.tipo === 'preguntar' ? preguntado.campo : 'nada';
        const { output } = await ai.generate({
          system: SISTEMA_EXTRACCION,
          prompt: `Se le acaba de preguntar por: ${campoPreguntado}\nMensaje del viajero: ${mensaje}`,
          output: { schema: ExtraccionSchema },
          config: { temperature: 0 },
        });
        // 2. Fusionar con lo que ya se sabía (solo valores válidos).
        if (output) estado = { ...estado, perfil: fusionarPerfil(estado.perfil, output) };

        // Un destino sin guía no se guarda: se dice y se vuelve a pedir, sin seguir con la entrevista.
        // Solo si se preguntaba por el destino: «la Alhambra y comer bien», respondiendo a los
        // intereses, no es un cambio de destino.
        const aviso = output?.destino && campoPreguntado === 'destino' ? avisoDestino(output.destino) : null;
        if (aviso) return { estado, respuesta: aviso, perfil: null, respaldo: null };
      }

      // 3. Decidir el siguiente paso.
      const paso = siguientePaso(estado);
      if (paso.tipo === 'terminar') {
        return {
          estado,
          respuesta: `¡Perfecto! Ya tengo lo que necesito: ${resumirPerfil(paso.perfil)}`,
          perfil: paso.perfil,
          respaldo: null,
        };
      }
      estado = { ...estado, preguntados: [...estado.preguntados, paso.campo] };

      // 4. Redactar la pregunta con el modelo y validarla; si no pasa, texto de reserva.
      const { objetivo, reserva, opciones } = pregunta(paso.campo, estado.perfil.destino);
      const { text } = await ai.generate({
        system: SISTEMA_PREGUNTA,
        prompt: [
          mensaje.trim() ? `El viajero acaba de decir: «${mensaje}»` : 'Es el inicio de la conversación.',
          `Pregúntale ${objetivo}.`,
        ].join('\n'),
      });
      const permitidos = [mensaje, reserva, 'Rumbo', ...DESTINOS.map((d) => d.nombre)];
      const validacion = validarMensaje(text, permitidos);
      // Si el modelo solo reacciona sin preguntar («¡Qué bien!»), se conserva su frase y se añade la pregunta.
      const redactada = !validacion.valido ? reserva : text.includes('?') ? text.trim() : `${text.trim()} ${reserva}`;
      return {
        estado,
        respuesta: `${redactada} ${opciones}`,
        perfil: null,
        respaldo: validacion.valido ? null : validacion.motivo,
      };
    },
  );
}
