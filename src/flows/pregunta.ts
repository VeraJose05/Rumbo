// RF-04, RF-06: flow de RAG básico: recupera fragmentos del destino y responde citándolos.
import { z, type Genkit, type RetrieverArgument } from 'genkit';
import { construirPromptRag, extraerCitas } from './rag.js';

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

export const FuenteSchema = z.object({
  cita: z.number(),
  seccion: z.string(),
  fuente: z.string(),
  url: z.string(),
  licencia: z.string(),
});

export const PreguntaSalidaSchema = z.object({
  respuesta: z.string(),
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
      const { text } = await ai.generate({ system, prompt });

      const fuentes = extraerCitas(text, documentos.length).map((cita) => {
        const metadatos = documentos[cita - 1]?.metadata ?? {};
        return {
          cita,
          seccion: String(metadatos.seccion ?? ''),
          fuente: String(metadatos.fuente ?? ''),
          url: String(metadatos.url ?? ''),
          licencia: String(metadatos.licencia ?? ''),
        };
      });
      return { respuesta: text, fuentes };
    },
  );
}
