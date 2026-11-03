// RF-08: modelos de lenguaje y de embeddings intercambiables por configuración.
import { describe, expect, it } from 'vitest';
import { cargarConfigModelos } from './modelos.js';

describe('cargarConfigModelos', () => {
  it('usa los valores por defecto si no hay variables de entorno', () => {
    expect(cargarConfigModelos({})).toEqual({
      llm: 'qwen2.5:3b',
      juez: 'gemma2:9b',
      embedder: 'bge-m3',
      dimensionesEmbedder: 1024,
      ollamaUrl: 'http://127.0.0.1:11434',
      contexto: 8192,
      reranker: 'BAAI/bge-reranker-v2-m3',
      rerankerUrl: 'http://127.0.0.1:8080',
    });
  });

  it('permite cambiar los modelos solo con variables de entorno', () => {
    const config = cargarConfigModelos({
      RUMBO_LLM: 'llama3.2:3b',
      RUMBO_JUEZ: 'llama3.1:8b',
      RUMBO_EMBEDDER: 'multilingual-e5-small',
      RUMBO_EMBEDDER_DIMENSIONES: '384',
      OLLAMA_URL: 'http://localhost:9999',
      RUMBO_CONTEXTO: '16384',
      RUMBO_RERANKER: 'BAAI/bge-reranker-base',
      RERANKER_URL: 'http://localhost:9090',
    });
    expect(config).toEqual({
      llm: 'llama3.2:3b',
      juez: 'llama3.1:8b',
      embedder: 'multilingual-e5-small',
      dimensionesEmbedder: 384,
      ollamaUrl: 'http://localhost:9999',
      contexto: 16384,
      reranker: 'BAAI/bge-reranker-base',
      rerankerUrl: 'http://localhost:9090',
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

  // RNF-10: sin URL del LLM se usa Ollama; con ella, una API compatible con OpenAI (p. ej. Groq).
  it('no define LLM remoto si no hay URL', () => {
    const config = cargarConfigModelos({});
    expect(config.llmUrl).toBeUndefined();
    expect(config.llmClave).toBeUndefined();
  });

  it('lee la URL y la clave del LLM remoto', () => {
    const config = cargarConfigModelos({
      RUMBO_LLM: 'openai/gpt-oss-120b',
      RUMBO_LLM_URL: 'https://api.groq.com/openai/v1',
      RUMBO_LLM_CLAVE: 'gsk_prueba',
    });
    expect(config.llm).toBe('openai/gpt-oss-120b');
    expect(config.llmUrl).toBe('https://api.groq.com/openai/v1');
    expect(config.llmClave).toBe('gsk_prueba');
  });

  it('rechaza una URL de LLM remoto inválida', () => {
    expect(() => cargarConfigModelos({ RUMBO_LLM_URL: 'groq' })).toThrow();
  });

  // RNF-10: embeddings de la pregunta por API (Cloudflare Workers AI) para desplegar sin Ollama.
  it('lee la URL y la clave del embedder remoto', () => {
    const config = cargarConfigModelos({
      RUMBO_EMBEDDER_URL: 'https://api.cloudflare.com/client/v4/accounts/abc/ai/run/@cf/baai/bge-m3',
      RUMBO_EMBEDDER_CLAVE: 'cf_prueba',
    });
    expect(config.embedderUrl).toBe('https://api.cloudflare.com/client/v4/accounts/abc/ai/run/@cf/baai/bge-m3');
    expect(config.embedderClave).toBe('cf_prueba');
  });

  it('no define embedder remoto si no hay URL', () => {
    expect(cargarConfigModelos({}).embedderUrl).toBeUndefined();
  });
});
