// RNF-02, RF-08: instancia de Genkit con los modelos locales de Ollama definidos en la configuración.
import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';
import type { ConfigModelos } from './config/modelos.js';

export function crearAi(config: ConfigModelos) {
  return genkit({
    plugins: [
      ollama({
        serverAddress: config.ollamaUrl,
        models: [{ name: config.llm, type: 'chat' }],
        embedders: [{ name: config.embedder, dimensions: config.dimensionesEmbedder }],
      }),
    ],
    model: `ollama/${config.llm}`,
  });
}
