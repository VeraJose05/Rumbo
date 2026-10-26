// RF-06, RNF-02: modelo de chat de Ollama con salida estructurada.
// El plugin genkitx-ollama (1.42 y 1.43) declara soportar salida restringida pero no envía el
// esquema a Ollama, así que el modelo responde en prosa. Este modelo sí lo envía en `format`,
// y Ollama obliga a que cada token generado encaje en el esquema.
import type { Genkit, GenerateRequest } from 'genkit';

interface PeticionOllama {
  model: string;
  stream: false;
  messages: { role: string; content: string }[];
  format?: 'json' | Record<string, unknown>;
  options: { temperature?: number };
}

export function aPeticionOllama(modelo: string, peticion: GenerateRequest): PeticionOllama {
  const resultado: PeticionOllama = {
    model: modelo,
    stream: false,
    messages: peticion.messages.map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content.map((c) => c.text ?? '').join(''),
    })),
    options: {},
  };
  if (peticion.output?.schema) resultado.format = peticion.output.schema;
  else if (peticion.output?.format === 'json') resultado.format = 'json';

  const temperatura = (peticion.config as { temperature?: number } | undefined)?.temperature;
  if (temperatura !== undefined) resultado.options.temperature = temperatura;
  return resultado;
}

/** Registra el modelo como `local/<modelo>`. */
export function definirModeloOllama(ai: Genkit, modelo: string, urlOllama: string) {
  return ai.defineModel(
    {
      name: `local/${modelo}`,
      // constrained: 'all' indica a Genkit que no hace falta meter el esquema en el prompt.
      supports: { multiturn: true, systemRole: true, constrained: 'all', output: ['text', 'json'] },
    },
    async (peticion) => {
      const respuesta = await fetch(`${urlOllama}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aPeticionOllama(modelo, peticion)),
      });
      if (!respuesta.ok) throw new Error(`Ollama respondió ${respuesta.status}: ${await respuesta.text()}`);
      const cuerpo = (await respuesta.json()) as { message: { content: string } };
      return { message: { role: 'model', content: [{ text: cuerpo.message.content }] }, finishReason: 'stop' };
    },
  );
}
