// RF-01: flow de entrevista. Cada llamada es un turno: recibe el estado y el mensaje del viajero
// y devuelve el estado nuevo y lo que responde Rumbo. El LLM solo extrae datos del mensaje;
// qué preguntar, cuándo terminar y el texto de las preguntas los pone el código.
import { z, type Genkit } from 'genkit';
import {
  avisoDestino,
  ETIQUETAS_INTERES,
  fusionarPerfil,
  listaDestinos,
  resumirPerfil,
  siguientePaso,
  type EstadoEntrevista,
} from './entrevista-logica.js';
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

// Todas las preguntas son textos fijos. Cuando las redactaba el modelo, ofrecía solo dos de los ocho
// intereses, se inventaba lugares («el Parque de Atracciones de Valencia») y hasta destinos
// («¿Te apuntas a un viaje al Caribe?»).
const SALUDO = `¡Hola! Soy Rumbo y te ayudo a planificar tu viaje. ¿A dónde quieres ir? Puedo ayudarte con ${listaDestinos()}.`;
const PREGUNTA_DESTINO = `¿A dónde quieres ir? Puedo ayudarte con ${listaDestinos()}.`;
const preguntaDias = (destino: unknown) => `¿Cuántos días vas a estar en ${destino}? Puedo planificar de 1 a 7.`;
const preguntaIntereses = (destino: unknown) =>
  `¿Qué te gustaría hacer en ${destino}? Puedes elegir varios: ${Object.values(ETIQUETAS_INTERES).join(', ')}.`;
const PREGUNTA_OPCIONALES =
  '¿Quieres contarme algo más? Por ejemplo, con quién viajas (solo, en pareja, en familia o con amigos), ' +
  'qué ritmo prefieres (tranquilo, normal o intenso) o tu presupuesto (bajo, medio o alto). Si no, dime «nada más».';

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
        const aviso = output?.destino ? avisoDestino(output.destino) : null;
        if (aviso) return { estado, respuesta: aviso, perfil: null };
      }

      // 3. Decidir el siguiente paso.
      const paso = siguientePaso(estado);
      if (paso.tipo === 'terminar') {
        return {
          estado,
          respuesta: `¡Perfecto! Ya tengo lo que necesito: ${resumirPerfil(paso.perfil)}`,
          perfil: paso.perfil,
        };
      }
      estado = { ...estado, preguntados: [...estado.preguntados, paso.campo] };
      const preguntas = {
        destino: mensaje.trim() ? PREGUNTA_DESTINO : SALUDO,
        dias: preguntaDias(estado.perfil.destino),
        intereses: preguntaIntereses(estado.perfil.destino),
        opcionales: PREGUNTA_OPCIONALES,
      };
      return { estado, respuesta: preguntas[paso.campo], perfil: null };
    },
  );
}
