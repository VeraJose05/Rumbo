// RF-08: modelos de lenguaje y de embeddings intercambiables por configuración.
import { z } from 'genkit';

export const ConfigModelosSchema = z.object({
  llm: z.string().min(1),
  embedder: z.string().min(1),
  dimensionesEmbedder: z.coerce.number().int().positive(),
  ollamaUrl: z.string().url(),
});

export type ConfigModelos = z.infer<typeof ConfigModelosSchema>;

const POR_DEFECTO = {
  llm: 'qwen2.5:3b',
  embedder: 'bge-m3',
  dimensionesEmbedder: 1024,
  ollamaUrl: 'http://127.0.0.1:11434',
};

type Entorno = Record<string, string | undefined>;

/** Lee la configuración de modelos del entorno; lanza un error si no es válida. */
export function cargarConfigModelos(env: Entorno = process.env): ConfigModelos {
  // Una variable vacía cuenta como no definida.
  const leer = (nombre: string) => env[nombre] || undefined;

  return ConfigModelosSchema.parse({
    llm: leer('RUMBO_LLM') ?? POR_DEFECTO.llm,
    embedder: leer('RUMBO_EMBEDDER') ?? POR_DEFECTO.embedder,
    dimensionesEmbedder: leer('RUMBO_EMBEDDER_DIMENSIONES') ?? POR_DEFECTO.dimensionesEmbedder,
    ollamaUrl: leer('OLLAMA_URL') ?? POR_DEFECTO.ollamaUrl,
  });
}
