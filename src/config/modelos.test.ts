// RF-08: modelos de lenguaje y de embeddings intercambiables por configuración.
import { describe, expect, it } from 'vitest';
import { cargarConfigModelos } from './modelos.js';

describe('cargarConfigModelos', () => {
  it('usa los valores por defecto si no hay variables de entorno', () => {
    expect(cargarConfigModelos({})).toEqual({
      llm: 'qwen2.5:3b',
      embedder: 'bge-m3',
      dimensionesEmbedder: 1024,
      ollamaUrl: 'http://127.0.0.1:11434',
    });
  });

  it('permite cambiar los modelos solo con variables de entorno', () => {
    const config = cargarConfigModelos({
      RUMBO_LLM: 'llama3.2:3b',
      RUMBO_EMBEDDER: 'multilingual-e5-small',
      RUMBO_EMBEDDER_DIMENSIONES: '384',
      OLLAMA_URL: 'http://localhost:9999',
    });
    expect(config).toEqual({
      llm: 'llama3.2:3b',
      embedder: 'multilingual-e5-small',
      dimensionesEmbedder: 384,
      ollamaUrl: 'http://localhost:9999',
    });
  });

  it('trata las variables vacías como no definidas', () => {
    expect(cargarConfigModelos({ RUMBO_LLM: '' }).llm).toBe('qwen2.5:3b');
  });

  it('rechaza una URL de Ollama inválida', () => {
    expect(() => cargarConfigModelos({ OLLAMA_URL: 'no-es-una-url' })).toThrow();
  });

  it('rechaza unas dimensiones que no sean un entero positivo', () => {
    expect(() => cargarConfigModelos({ RUMBO_EMBEDDER_DIMENSIONES: 'mil' })).toThrow();
    expect(() => cargarConfigModelos({ RUMBO_EMBEDDER_DIMENSIONES: '-3' })).toThrow();
  });
});
