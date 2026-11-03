// RNF-10: LLM servido por una API compatible con OpenAI (Groq u otro), para el despliegue a coste 0.
// Es el gemelo de ollama.ts: los flows no saben qué proveedor responde.
// Salida estructurada con response_format json_schema en modo estricto: el proveedor obliga a que
// cada token encaje en el esquema. Sin modo estricto, qwen en Groq devolvió caracteres corruptos.
import type { Genkit, GenerateRequest } from 'genkit';

type Esquema = Record<string, unknown>;

interface PeticionOpenAI {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  seed?: number;
  response_format?:
    | { type: 'json_object' }
    | { type: 'json_schema'; json_schema: { name: string; strict: boolean; schema: Esquema } };
}

/** Error que la web muestra como aviso: el plan gratuito del proveedor se ha agotado por ahora. */
export class CuotaAgotadaError extends Error {
  constructor(detalle: string) {
    super(`Se ha agotado la cuota gratuita del modelo; inténtalo de nuevo en unos minutos. (${detalle})`);
    this.name = 'CuotaAgotadaError';
  }
}

export function errorDeRespuesta(estado: number, detalle: string): Error {
  if (estado === 429) return new CuotaAgotadaError(detalle);
  return new Error(`El proveedor del LLM respondió ${estado}: ${detalle}`);
}

/**
 * Adapta el esquema de Genkit al modo estricto de OpenAI: cada objeto con additionalProperties
 * false y sin $schema. Si algún objeto tiene campos opcionales, el modo estricto no se puede usar.
 */
export function aEsquemaEstricto(original: Esquema): { schema: Esquema; estricto: boolean } {
  let estricto = true;
  const cerrar = (nodo: unknown): unknown => {
    if (Array.isArray(nodo)) return nodo.map(cerrar);
    if (nodo === null || typeof nodo !== 'object') return nodo;
    const copia: Esquema = {};
    for (const [clave, valor] of Object.entries(nodo)) {
      if (clave !== '$schema') copia[clave] = cerrar(valor);
    }
    if (copia.type === 'object' || copia.properties) {
      copia.additionalProperties = false;
      const propiedades = Object.keys((copia.properties as Esquema | undefined) ?? {});
      const requeridas = (copia.required as string[] | undefined) ?? [];
      if (propiedades.some((p) => !requeridas.includes(p))) estricto = false;
    }
    return copia;
  };
  return { schema: cerrar(original) as Esquema, estricto };
}

export function aPeticionOpenAI(modelo: string, peticion: GenerateRequest): PeticionOpenAI {
  const resultado: PeticionOpenAI = {
    model: modelo,
    messages: peticion.messages.map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content.map((c) => c.text ?? '').join(''),
    })),
  };
  if (peticion.output?.schema) {
    const { schema, estricto } = aEsquemaEstricto(peticion.output.schema);
    resultado.response_format = { type: 'json_schema', json_schema: { name: 'salida', strict: estricto, schema } };
  } else if (peticion.output?.format === 'json') {
    resultado.response_format = { type: 'json_object' };
  }
  const config = peticion.config as { temperature?: number; seed?: number } | undefined;
  if (config?.temperature !== undefined) resultado.temperature = config.temperature;
  if (config?.seed !== undefined) resultado.seed = config.seed;
  return resultado;
}

/** Registra el modelo como `remoto/<modelo>`. */
export function definirModeloRemoto(ai: Genkit, modelo: string, url: string, clave: string | undefined) {
  return ai.defineModel(
    {
      name: `remoto/${modelo}`,
      supports: { multiturn: true, systemRole: true, constrained: 'all', output: ['text', 'json'] },
    },
    async (peticion) => {
      const respuesta = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(clave ? { Authorization: `Bearer ${clave}` } : {}) },
        body: JSON.stringify(aPeticionOpenAI(modelo, peticion)),
      });
      if (!respuesta.ok) throw errorDeRespuesta(respuesta.status, await respuesta.text());
      const cuerpo = (await respuesta.json()) as { choices?: { message?: { content?: string } }[] };
      const texto = cuerpo.choices?.[0]?.message?.content;
      if (texto === undefined) throw new Error(`El proveedor del LLM respondió sin texto: ${JSON.stringify(cuerpo)}`);
      return { message: { role: 'model', content: [{ text: texto }] }, finishReason: 'stop' };
    },
  );
}
