// RF-06, RNF-02: traducción de una petición de Genkit a la API de chat de Ollama.
import type { GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { aPeticionOllama } from './ollama.js';

const mensajes: GenerateRequest['messages'] = [
  { role: 'system', content: [{ text: 'Eres un asistente.' }] },
  { role: 'user', content: [{ text: 'Hola' }, { text: ' Sevilla' }] },
  { role: 'model', content: [{ text: '¿Qué quieres?' }] },
];

describe('aPeticionOllama', () => {
  it('fija la ventana de contexto para que Ollama no recorte el prompt', () => {
    expect(aPeticionOllama('qwen2.5:3b', { messages: mensajes }, 8192).options).toEqual({ num_ctx: 8192 });
  });

  it('convierte los mensajes y renombra el rol model a assistant', () => {
    expect(aPeticionOllama('qwen2.5:3b', { messages: mensajes })).toEqual({
      model: 'qwen2.5:3b',
      stream: false,
      messages: [
        { role: 'system', content: 'Eres un asistente.' },
        { role: 'user', content: 'Hola Sevilla' },
        { role: 'assistant', content: '¿Qué quieres?' },
      ],
      options: {},
    });
  });

  it('envía el esquema de salida como format para restringir la generación', () => {
    const esquema = { type: 'object', properties: { respuesta: { type: 'string' } } };

    const peticion = aPeticionOllama('qwen2.5:3b', { messages: mensajes, output: { format: 'json', schema: esquema } });

    expect(peticion.format).toEqual(esquema);
  });

  it('pide JSON libre si el formato es json pero no hay esquema', () => {
    expect(aPeticionOllama('qwen2.5:3b', { messages: mensajes, output: { format: 'json' } }).format).toBe('json');
  });

  it('pasa la temperatura de la configuración', () => {
    expect(aPeticionOllama('qwen2.5:3b', { messages: mensajes, config: { temperature: 0 } }).options).toEqual({
      temperature: 0,
    });
  });
});
