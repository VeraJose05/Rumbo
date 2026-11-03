// RF-08: modelos de lenguaje y de embeddings intercambiables por configuración.
import { z } from 'genkit';

export const ConfigModelosSchema = z.object({
  llm: z.string().min(1),
  // Modelo que puntúa los itinerarios en la evaluación (F5). De otra familia que el generador,
  // porque un juez tiende a favorecer los textos de su propia familia.
  juez: z.string().min(1),
  embedder: z.string().min(1),
  dimensionesEmbedder: z.coerce.number().int().positive(),
  ollamaUrl: z.string().url(),
  // Ventana de contexto del LLM en tokens. Ollama corta en silencio lo que no cabe: con su valor
  // por defecto solo leía unos 2.000 tokens de un prompt de 7.000.
  contexto: z.coerce.number().int().positive(),
  // RF-09 (C2): cross-encoder que reordena los fragmentos. Lo sirve el contenedor `reranker`
  // de docker-compose.yml; el nombre se guarda en cada resultado para saber con cuál se midió.
  reranker: z.string().min(1),
  rerankerUrl: z.string().url(),
  // RNF-10: API compatible con OpenAI para el LLM (p. ej. Groq). Sin URL, el LLM va por Ollama.
  // El juez de la evaluación sigue siempre en local.
  llmUrl: z.string().url().optional(),
  llmClave: z.string().optional(),
  // RNF-10: endpoint REST del embedder (Cloudflare Workers AI). Sin URL, los embeddings van por Ollama.
  // Debe ser el mismo modelo con el que se hizo el índice (bge-m3).
  embedderUrl: z.string().url().optional(),
  embedderClave: z.string().optional(),
});

export type ConfigModelos = z.infer<typeof ConfigModelosSchema>;

const POR_DEFECTO = {
  llm: 'qwen2.5:3b',
  juez: 'gemma2:9b',
  embedder: 'bge-m3',
  dimensionesEmbedder: 1024,
  ollamaUrl: 'http://127.0.0.1:11434',
  contexto: 8192,
  reranker: 'BAAI/bge-reranker-v2-m3',
  rerankerUrl: 'http://127.0.0.1:8080',
};

type Entorno = Record<string, string | undefined>;

/** Lee la configuración de modelos del entorno; lanza un error si no es válida. */
export function cargarConfigModelos(env: Entorno = process.env): ConfigModelos {
  // Una variable vacía cuenta como no definida.
  const leer = (nombre: string) => env[nombre] || undefined;

  return ConfigModelosSchema.parse({
    llm: leer('RUMBO_LLM') ?? POR_DEFECTO.llm,
    juez: leer('RUMBO_JUEZ') ?? POR_DEFECTO.juez,
    embedder: leer('RUMBO_EMBEDDER') ?? POR_DEFECTO.embedder,
    dimensionesEmbedder: leer('RUMBO_EMBEDDER_DIMENSIONES') ?? POR_DEFECTO.dimensionesEmbedder,
    ollamaUrl: leer('OLLAMA_URL') ?? POR_DEFECTO.ollamaUrl,
    contexto: leer('RUMBO_CONTEXTO') ?? POR_DEFECTO.contexto,
    reranker: leer('RUMBO_RERANKER') ?? POR_DEFECTO.reranker,
    rerankerUrl: leer('RERANKER_URL') ?? POR_DEFECTO.rerankerUrl,
    llmUrl: leer('RUMBO_LLM_URL'),
    llmClave: leer('RUMBO_LLM_CLAVE'),
    embedderUrl: leer('RUMBO_EMBEDDER_URL'),
    embedderClave: leer('RUMBO_EMBEDDER_CLAVE'),
  });
}

export interface ProveedorExterno {
  uso: string;
  servicio: string;
  modelo: string;
}

/** RNF-09: servicios externos que reciben los mensajes del viajero (vacío si todo va por Ollama). */
export function proveedoresExternos(config: ConfigModelos): ProveedorExterno[] {
  const lista: ProveedorExterno[] = [];
  if (config.llmUrl) lista.push({ uso: 'modelo de lenguaje', servicio: new URL(config.llmUrl).host, modelo: config.llm });
  if (config.embedderUrl) {
    lista.push({ uso: 'búsqueda en la guía', servicio: new URL(config.embedderUrl).host, modelo: config.embedder });
  }
  return lista;
}
