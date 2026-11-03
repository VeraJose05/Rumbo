// RNF-02, RF-08, RNF-10: instancia de Genkit con los modelos definidos en la configuración:
// Ollama en local o, si hay RUMBO_LLM_URL, un LLM remoto compatible con OpenAI (despliegue).
import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';
import type { ConfigModelos } from './config/modelos.js';
import { definirModeloOllama } from './modelos/ollama.js';
import { definirModeloRemoto } from './modelos/remoto.js';

export function crearAi(config: ConfigModelos) {
  const ai = genkit({
    // Del plugin solo se usa el embedder; el LLM va por modelos/ollama.ts para tener salida estructurada.
    plugins: [
      ollama({
        serverAddress: config.ollamaUrl,
        embedders: [{ name: config.embedder, dimensions: config.dimensionesEmbedder }],
      }),
    ],
    model: config.llmUrl ? `remoto/${config.llm}` : `local/${config.llm}`,
  });
  if (config.llmUrl) definirModeloRemoto(ai, config.llm, config.llmUrl, config.llmClave);
  else definirModeloOllama(ai, config.llm, config.ollamaUrl, config.contexto);
  // El juez de la evaluación (F5); si es el mismo modelo que el generador, ya está registrado.
  if (config.llmUrl || config.juez !== config.llm) definirModeloOllama(ai, config.juez, config.ollamaUrl, config.contexto);
  return ai;
}
