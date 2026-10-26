// RNF-02: flow de prueba de F0, probado con un modelo simulado (sin Ollama).
import { genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { definirPruebaFlow } from './prueba.js';

function crearAiSimulada() {
  const peticiones: GenerateRequest[] = [];
  const ai = genkit({ model: 'simulado' });
  ai.defineModel({ name: 'simulado' }, async (peticion) => {
    peticiones.push(peticion);
    return { message: { role: 'model', content: [{ text: 'Hola desde el modelo simulado' }] } };
  });
  return { ai, peticiones };
}

describe('pruebaFlow', () => {
  it('devuelve la respuesta del modelo', async () => {
    const { ai } = crearAiSimulada();
    const pruebaFlow = definirPruebaFlow(ai);

    const salida = await pruebaFlow({ pregunta: '¿Qué ver en Sevilla?' });

    expect(salida).toEqual({ respuesta: 'Hola desde el modelo simulado' });
  });

  it('envía la pregunta al modelo y le pide responder en español', async () => {
    const { ai, peticiones } = crearAiSimulada();
    const pruebaFlow = definirPruebaFlow(ai);

    await pruebaFlow({ pregunta: '¿Qué ver en Sevilla?' });

    const textos = peticiones[0]?.messages.flatMap((m) => m.content.map((c) => c.text ?? ''));
    expect(textos).toContain('¿Qué ver en Sevilla?');
    expect(textos?.join(' ')).toMatch(/español/i);
  });

  it('rechaza una pregunta vacía', async () => {
    const { ai } = crearAiSimulada();
    const pruebaFlow = definirPruebaFlow(ai);

    await expect(pruebaFlow({ pregunta: '' })).rejects.toThrow();
  });
});
