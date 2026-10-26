// RNF-02, RF-08: instancia de Genkit con los modelos locales de Ollama definidos en la configuración.
import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';
import type { ConfigModelos } from './config/modelos.js';
import { definirModeloOllama } from './modelos/ollama.js';

export function crearAi(config: ConfigModelos) {
  const ai = genkit({
    // Del plugin solo se usa el embedder; el LLM va por modelos/ollama.ts para tener salida estructurada.
    plugins: [
      ollama({
        serverAddress: config.ollamaUrl,
        embedders: [{ name: config.embedder, dimensions: config.dimensionesEmbedder }],
      }),
    ],
    model: `local/${config.llm}`,
  });
  definirModeloOllama(ai, config.llm, config.ollamaUrl);
  return ai;
}
