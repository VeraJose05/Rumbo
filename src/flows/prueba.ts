// RNF-02: flow de prueba de F0 para comprobar que Genkit responde con un modelo local.
import { z, type Genkit } from 'genkit';

export const PruebaEntradaSchema = z.object({
  pregunta: z.string().min(1),
});

export const PruebaSalidaSchema = z.object({
  respuesta: z.string(),
});

// RNF-05: la conversación es en español.
const SISTEMA = 'Eres un asistente de viajes. Responde siempre en español, de forma breve.';

/** Define el flow en la instancia recibida, para poder probarlo con un modelo simulado. */
export function definirPruebaFlow(ai: Genkit) {
  return ai.defineFlow(
    { name: 'pruebaFlow', inputSchema: PruebaEntradaSchema, outputSchema: PruebaSalidaSchema },
    async ({ pregunta }) => {
      const { text } = await ai.generate({ system: SISTEMA, prompt: pregunta });
      return { respuesta: text };
    },
  );
}
