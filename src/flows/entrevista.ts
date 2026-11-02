// RF-01: flow de entrevista. Cada llamada es un turno: recibe el estado y el mensaje del viajero
// y devuelve el estado nuevo y lo que responde Rumbo. El código decide qué preguntar y cuándo
// terminar; el LLM extrae datos del mensaje y redacta la pregunta con naturalidad, y un
// guardarraíl comprueba lo que redacta antes de enseñarlo.
import { z, type Genkit } from 'genkit';
import { DESTINOS } from '../config/destinos.js';
import {
  avisoDestino,
  descartarSinRespaldo,
  esAfirmacion,
  ETIQUETAS_INTERES,
  fusionarPerfil,
  listaDestinos,
  opcionalesPendientes,
  respaldarIntereses,
  resumirPerfil,
  siguientePaso,
  type EstadoEntrevista,
  type MensajeConversacion,
} from './entrevista-logica.js';
import { quitarSaludo, validarMensaje } from './guardarrail.js';
import { COMPANIAS, INTERESES, PerfilSchema, PRESUPUESTOS, RITMOS } from './perfil.js';

const EstadoSchema = z.object({
  perfil: z.record(z.string(), z.unknown()),
  preguntados: z.array(z.string()),
  // Opcional para seguir aceptando estados de antes de guardar la conversación.
  historial: z.array(z.object({ rol: z.enum(['viajero', 'rumbo']), texto: z.string() })).optional(),
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
  interesesQuitar: z.array(z.enum(INTERESES)),
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
- compania: solo, pareja, familia (con hijos o familiares) o amigos.
- interesesQuitar: intereses de la lista que el viajero pide quitar («quita el ocio nocturno»).
Si el viajero corrige datos que ya se conocen («mejor 2 días»), pon solo el valor nuevo de lo que cambia; lo que no menciona va a null.`;

type Campo = 'destino' | 'dias' | 'intereses' | 'opcionales';

// Cómo se ofrece cada dato opcional en la pregunta; solo se nombran los que faltan.
const TEXTO_OPCIONAL = {
  compania: 'con quién viajas (solo, en pareja, en familia o con amigos)',
  ritmo: 'qué ritmo prefieres (tranquilo, normal o intenso)',
  presupuesto: 'tu presupuesto (bajo, medio o alto)',
};

// Para cada pregunta: qué tiene que preguntar el modelo, el texto de reserva si su redacción no pasa
// el guardarraíl, y las opciones, que añade siempre el código porque el modelo las recortaba
// (ofrecía dos de los ocho intereses).
function pregunta(campo: Campo, perfil: Record<string, unknown>): { objetivo: string; reserva: string; opciones: string } {
  const destino = perfil.destino;
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
    case 'opcionales': {
      const textos = opcionalesPendientes(perfil).map((c) => TEXTO_OPCIONAL[c]);
      const lista = textos.length > 1 ? `${textos.slice(0, -1).join(', ')} o ${textos.at(-1)}` : textos[0];
      return {
        objetivo: 'si quiere contar algo más del viaje (es opcional)',
        reserva: '¿Quieres contarme algo más?',
        opciones: `Por ejemplo, ${lista}. Si no, dime «nada más».`,
      };
    }
  }
}

const SISTEMA_PREGUNTA = `Eres Rumbo, un asistente que ayuda a planificar viajes. Hablas en español, con un tono cercano y natural.
Escribe tu siguiente mensaje al viajero: una reacción breve a lo que acaba de decir (o un saludo si es el inicio) y la pregunta que se te indica.
- Tutea al viajero y no le llames por ningún nombre.
- Saluda solo si es el inicio de la conversación.
- Como mucho dos frases cortas, y la segunda es una pregunta.
- No menciones ningún lugar, destino ni recomendación que el viajero no haya dicho.
- No enumeres opciones: se añaden después.`;

type Entrada = z.infer<typeof EntrevistaEntradaSchema>;
type Salida = z.infer<typeof EntrevistaSalidaSchema>;

export function definirEntrevistaFlow(ai: Genkit) {
  return ai.defineFlow(
    { name: 'entrevistaFlow', inputSchema: EntrevistaEntradaSchema, outputSchema: EntrevistaSalidaSchema },
    async (entrada) => {
      // El historial se apunta aquí, en un solo sitio, sea cual sea el camino que tome el turno.
      const salida = await turno(ai, entrada);
      const historial: MensajeConversacion[] = [
        ...(entrada.estado?.historial ?? []),
        ...(entrada.mensaje.trim() ? [{ rol: 'viajero' as const, texto: entrada.mensaje }] : []),
        { rol: 'rumbo', texto: salida.respuesta },
      ];
      return { ...salida, estado: { ...salida.estado, historial } };
    },
  );
}

// Roles de Genkit: el viajero es el usuario y Rumbo es el modelo.
const ROL_GENKIT = { viajero: 'user', rumbo: 'model' } as const;

/** Un turno de la entrevista, sin ocuparse del historial. */
async function turno(ai: Genkit, { estado: estadoPrevio, mensaje }: Entrada): Promise<Salida> {
  const historialPrevio = estadoPrevio?.historial ?? [];
  let estado: EstadoEntrevista = estadoPrevio ?? { perfil: {}, preguntados: [] };

  // La última pregunta hecha: ayuda a entender respuestas cortas como «3» o «sí».
  const campoPreguntado = estado.preguntados.at(-1) ?? 'nada';

  // Un «sí» a la confirmación se reconoce en código: el extractor se inventaba datos con él.
  if (campoPreguntado === 'confirmacion' && esAfirmacion(mensaje)) {
    estado = { ...estado, preguntados: [...estado.preguntados, 'confirmado'] };
  }
  // 1. Extraer datos del mensaje, sabiendo qué se le había preguntado y lo que ya se sabe.
  else if (mensaje.trim()) {
    const { output } = await ai.generate({
      system: SISTEMA_EXTRACCION,
      prompt: [
        `Se le acaba de preguntar por: ${campoPreguntado}`,
        `Datos que ya se conocen: ${JSON.stringify(estado.perfil)}`,
        `Mensaje del viajero: ${mensaje}`,
      ].join('\n'),
      output: { schema: ExtraccionSchema },
      config: { temperature: 0 },
    });
    // 2. Fusionar con lo que ya se sabía (solo valores válidos).
    const anterior = estado.perfil;
    if (output) {
      // Quitar intereses solo al corregir en la confirmación: respondiendo a otra pregunta, el
      // extractor convertía un «nada más» en «quita monumentos».
      // Lo que el viajero no ha dicho no se guarda, aunque el modelo lo extraiga (ver entrevista-logica).
      const conRespaldo = { ...descartarSinRespaldo(output, mensaje), intereses: respaldarIntereses(output.intereses, mensaje) };
      const extraido = campoPreguntado === 'confirmacion' ? conRespaldo : { ...conRespaldo, interesesQuitar: [] };
      estado = { ...estado, perfil: fusionarPerfil(estado.perfil, extraido) };
    }

    // Respuesta a la confirmación que no es un simple «sí»: con cambios, se vuelve a confirmar;
    // sin cambios, se pregunta qué cambiar. Solo el código da el perfil por confirmado: cuando lo
    // decidía el modelo, «añade gastronomía» acababa confirmado sin añadir nada.
    if (campoPreguntado === 'confirmacion') {
      const cambios = JSON.stringify(anterior) !== JSON.stringify(estado.perfil);
      if (!cambios) {
        estado = { ...estado, preguntados: [...estado.preguntados, 'confirmacion'] };
        const respuesta = 'Vale, ¿qué quieres cambiar? Si está todo bien, dime «sí».';
        return { estado, respuesta, perfil: null, respaldo: null };
      } else {
        const paso = siguientePaso(estado);
        if (paso.tipo === 'confirmar') {
          estado = { ...estado, preguntados: [...estado.preguntados, 'confirmacion'] };
          const respuesta = `Hecho, ahora queda así: ${resumirPerfil(paso.perfil, opcionalesPendientes(estado.perfil))} ¿Está bien así?`;
          return { estado, respuesta, perfil: null, respaldo: null };
        }
      }
    }

    // Un destino sin guía no se guarda: se dice y se vuelve a pedir, sin seguir con la entrevista.
    // Solo si se preguntaba por el destino: «la Alhambra y comer bien», respondiendo a los
    // intereses, no es un cambio de destino.
    const aviso = output?.destino && campoPreguntado === 'destino' ? avisoDestino(output.destino) : null;
    if (aviso) return { estado, respuesta: aviso, perfil: null, respaldo: null };
  }

  // 3. Decidir el siguiente paso.
  const paso = siguientePaso(estado);
  if (paso.tipo === 'terminar') {
    return { estado, respuesta: '¡Perfecto! Preparo tu itinerario.', perfil: paso.perfil, respaldo: null };
  }
  if (paso.tipo === 'confirmar') {
    estado = { ...estado, preguntados: [...estado.preguntados, 'confirmacion'] };
    const resumen = resumirPerfil(paso.perfil, opcionalesPendientes(estado.perfil));
    const respuesta = `Esto es lo que he entendido: ${resumen} ¿Es correcto, o quieres cambiar algo?`;
    return { estado, respuesta, perfil: null, respaldo: null };
  }
  estado = { ...estado, preguntados: [...estado.preguntados, paso.campo] };

  // 4. Redactar la pregunta con el modelo y validarla; si no pasa, texto de reserva.
  const { objetivo, reserva, opciones } = pregunta(paso.campo, estado.perfil);
  const { text } = await ai.generate({
    system: SISTEMA_PREGUNTA,
    // La conversación anterior va como mensajes de chat; el turno actual, en el prompt.
    messages: historialPrevio.map((m) => ({ role: ROL_GENKIT[m.rol], content: [{ text: m.texto }] })),
    prompt: [
      mensaje.trim() ? `El viajero acaba de decir: «${mensaje}»` : 'Es el inicio de la conversación.',
      `Pregúntale ${objetivo}.`,
    ].join('\n'),
  });
  const permitidos = [mensaje, reserva, 'Rumbo', ...DESTINOS.map((d) => d.nombre)];
  const validacion = validarMensaje(text, permitidos);
  // Si el modelo solo reacciona sin preguntar («¡Qué bien!»), se conserva su frase y se añade la pregunta.
  const propia = mensaje.trim() ? quitarSaludo(text.trim()) : text.trim();
  const redactada = !validacion.valido || !propia ? reserva : propia.includes('?') ? propia : `${propia} ${reserva}`;
  return {
    estado,
    respuesta: `${redactada} ${opciones}`,
    perfil: null,
    respaldo: validacion.valido ? null : validacion.motivo,
  };
}
