// RNF-10: embedder de Genkit sobre la API REST de Cloudflare Workers AI, para desplegar sin Ollama
// (el servidor gratuito tiene 512 MB y no cabe). bge-m3 de Cloudflare da los mismos vectores que el de
// Ollama para las preguntas (coseno 1,0000 y el mismo top-5 en 7 consultas), así que el índice vale.
import type { Genkit } from 'genkit';

interface RespuestaCloudflare {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: { data?: number[][] };
}

export function aPeticionEmbeddings(textos: string[]) {
  return { text: textos };
}

export function deRespuestaEmbeddings(respuesta: RespuestaCloudflare, cuantos: number) {
  if (respuesta.success === false) {
    const errores = (respuesta.errors ?? []).map((e) => e.message).join('; ');
    throw new Error(`El embedder remoto respondió con error: ${errores}`);
  }
  const vectores = respuesta.result?.data ?? [];
  if (vectores.length !== cuantos) {
    throw new Error(`El embedder remoto devolvió ${vectores.length} vectores para ${cuantos} textos`);
  }
  return vectores.map((embedding) => ({ embedding }));
}

/** Registra el embedder como `remoto/<modelo>`. */
export function definirEmbedderRemoto(ai: Genkit, modelo: string, dimensiones: number, url: string, clave?: string) {
  return ai.defineEmbedder(
    { name: `remoto/${modelo}`, info: { dimensions: dimensiones, label: `${modelo} (remoto)` } },
    async (documentos) => {
      const textos = documentos.map((d) => d.text);
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(clave ? { Authorization: `Bearer ${clave}` } : {}) },
        body: JSON.stringify(aPeticionEmbeddings(textos)),
      });
      const cuerpo = (await respuesta.json().catch(() => ({ success: false, errors: [{ message: `HTTP ${respuesta.status}` }] }))) as RespuestaCloudflare;
      return { embeddings: deRespuestaEmbeddings(cuerpo, textos.length) };
    },
  );
}
