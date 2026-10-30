// RF-04, RF-06, RF-07: flow de RAG básico: recupera fragmentos del destino y responde con
// recomendaciones estructuradas, cada una con sus citas comprobadas.
import { z, type Genkit, type RetrieverArgument } from 'genkit';
import { citasValidas, construirPromptRag, fuentesCitadas, verificarRecomendacion } from './rag.js';

export const OpcionesRecuperacionSchema = z.object({
  k: z.number().int().positive(),
  destino: z.string().min(1),
});

export const PreguntaEntradaSchema = z.object({
  pregunta: z.string().min(1),
  destino: z.string().min(1),
  k: z.number().int().positive().optional(),
});

/** Número de fragmentos que se recuperan si no se indica otro. */
export const K_POR_DEFECTO = 5;

// Lo que genera el modelo. El orden importa: genera de arriba abajo, así que primero decide si hay
// información, luego las recomendaciones con sus citas y por último el resumen. Con «respuesta»
// delante, el modelo lo escribía todo ahí y dejaba las recomendaciones vacías.
const RespuestaModeloSchema = z.object({
  hayInformacion: z.boolean(),
  recomendaciones: z.array(
    z.object({
      lugar: z.string(),
      detalle: z.string(),
      // min(1): el esquema obliga a citar al menos un texto en cada recomendación.
      citas: z.array(z.number().int()).min(1),
    }),
  ),
  respuesta: z.string(),
});

export const FuenteSchema = z.object({
  cita: z.number(),
  seccion: z.string(),
  fuente: z.string(),
  url: z.string(),
  licencia: z.string(),
});

export const PreguntaSalidaSchema = z.object({
  hayInformacion: z.boolean(),
  respuesta: z.string(),
  recomendaciones: z.array(
    z.object({
      lugar: z.string(),
      detalle: z.string(),
      citas: z.array(z.number()),
      /** El lugar aparece en los textos que cita. */
      verificada: z.boolean(),
    }),
  ),
  fuentes: z.array(FuenteSchema),
});

/** Define el flow con el recuperador recibido, para poder probarlo con uno simulado. */
export function definirPreguntaFlow(ai: Genkit, recuperador: RetrieverArgument<typeof OpcionesRecuperacionSchema>) {
  return ai.defineFlow(
    { name: 'preguntaFlow', inputSchema: PreguntaEntradaSchema, outputSchema: PreguntaSalidaSchema },
    async ({ pregunta, destino, k = K_POR_DEFECTO }) => {
      const documentos = await ai.retrieve({ retriever: recuperador, query: pregunta, options: { k, destino } });

      const { system, prompt } = construirPromptRag(
        pregunta,
        destino,
        documentos.map((d) => ({ texto: d.text, seccion: String(d.metadata?.seccion ?? '') })),
      );
      const { output } = await ai.generate({ system, prompt, output: { schema: RespuestaModeloSchema } });
      if (!output) throw new Error('El modelo no devolvió una respuesta con el esquema esperado');

      const recomendaciones = output.recomendaciones.map((r) => {
        const citas = citasValidas(r.citas, documentos.length);
        const textosCitados = citas.map((c) => documentos[c - 1]!.text);
        return { ...r, citas, verificada: verificarRecomendacion(r.lugar, textosCitados, destino) };
      });

      const citadas = citasValidas(recomendaciones.flatMap((r) => r.citas), documentos.length);
      const fuentes = fuentesCitadas(citadas, documentos);

      return { hayInformacion: output.hayInformacion, respuesta: output.respuesta, recomendaciones, fuentes };
    },
  );
}
