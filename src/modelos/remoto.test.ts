// RNF-10: traducción de una petición de Genkit a una API compatible con OpenAI (Groq).
import type { GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { aEsquemaEstricto, aPeticionOpenAI, CuotaAgotadaError, errorDeRespuesta, esperaAntesDeReintentar } from './remoto.js';

const mensajes: GenerateRequest['messages'] = [
  { role: 'system', content: [{ text: 'Eres un asistente.' }] },
  { role: 'user', content: [{ text: 'Hola' }, { text: ' Sevilla' }] },
  { role: 'model', content: [{ text: '¿Qué quieres?' }] },
];

describe('aPeticionOpenAI', () => {
  it('convierte los mensajes y renombra el rol model a assistant', () => {
    expect(aPeticionOpenAI('openai/gpt-oss-120b', { messages: mensajes })).toEqual({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'Eres un asistente.' },
        { role: 'user', content: 'Hola Sevilla' },
        { role: 'assistant', content: '¿Qué quieres?' },
      ],
    });
  });

  it('pasa la temperatura y la semilla', () => {
    const peticion = aPeticionOpenAI('m', { messages: mensajes, config: { temperature: 0.8, seed: 2 } });
    expect(peticion.temperature).toBe(0.8);
    expect(peticion.seed).toBe(2);
  });

  it('envía el esquema de salida como json_schema estricto', () => {
    const schema = {
      type: 'object',
      properties: { lugar: { type: 'string' } },
      required: ['lugar'],
      additionalProperties: true,
      $schema: 'http://json-schema.org/draft-07/schema#',
    };
    expect(aPeticionOpenAI('m', { messages: mensajes, output: { schema } }).response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'salida',
        strict: true,
        schema: { type: 'object', properties: { lugar: { type: 'string' } }, required: ['lugar'], additionalProperties: false },
      },
    });
  });

  it('pide JSON libre si hay formato json sin esquema', () => {
    expect(aPeticionOpenAI('m', { messages: mensajes, output: { format: 'json' } }).response_format).toEqual({
      type: 'json_object',
    });
  });
});

describe('aEsquemaEstricto', () => {
  it('cierra todos los objetos anidados, también dentro de arrays', () => {
    const { schema } = aEsquemaEstricto({
      type: 'object',
      properties: {
        actividades: {
          type: 'array',
          items: { type: 'object', properties: { lugar: { type: 'string' } }, required: ['lugar'] },
        },
      },
      required: ['actividades'],
    });
    const items = (schema.properties as any).actividades.items;
    expect(schema.additionalProperties).toBe(false);
    expect(items.additionalProperties).toBe(false);
  });

  it('no es estricto si algún campo es opcional (el modo estricto exige todos en required)', () => {
    const { estricto } = aEsquemaEstricto({
      type: 'object',
      properties: { lugar: { type: 'string' }, precio: { type: 'number' } },
      required: ['lugar'],
    });
    expect(estricto).toBe(false);
  });

  it('no modifica el esquema original', () => {
    const original = { type: 'object', properties: {}, additionalProperties: true };
    aEsquemaEstricto(original);
    expect(original.additionalProperties).toBe(true);
  });
});

describe('errorDeRespuesta', () => {
  it('convierte un 429 en un error de cuota agotada con mensaje para el viajero', () => {
    const error = errorDeRespuesta(429, 'Rate limit reached');
    expect(error).toBeInstanceOf(CuotaAgotadaError);
    expect(error.message).toMatch(/cuota/i);
  });

  it('el error de cuota llega a la web como 429 y sin el detalle técnico del proveedor', () => {
    const error = errorDeRespuesta(429, '{"error":"Rate limit reached for org_123"}') as CuotaAgotadaError;
    expect(error.code).toBe(429);
    expect(error.toJSON().message).not.toContain('org_123');
  });

  it('deja el resto de errores con el código y el detalle', () => {
    const error = errorDeRespuesta(500, 'fallo interno');
    expect(error).not.toBeInstanceOf(CuotaAgotadaError);
    expect(error.message).toContain('500');
    expect(error.message).toContain('fallo interno');
  });
});

// El plan gratuito de Groq limita los tokens por minuto (8.000): un itinerario de varios días lo
// supera, pero basta con esperar unos segundos. El límite diario, en cambio, no merece la espera.
describe('esperaAntesDeReintentar', () => {
  const cuota = { estado: 429, retryAfter: '12', cuerpo: '', intento: 0 };

  it('espera lo que indica la cabecera retry-after, en milisegundos', () => {
    expect(esperaAntesDeReintentar(cuota)).toBe(12_000);
  });

  it('si no hay cabecera, lee la espera del mensaje de error', () => {
    const cuerpo = '{"error":{"message":"Rate limit reached ... Please try again in 12.3375s. Need more tokens?"}}';
    expect(esperaAntesDeReintentar({ ...cuota, retryAfter: null, cuerpo })).toBe(12_338);
  });

  it('no reintenta si la espera es larga (límite diario)', () => {
    expect(esperaAntesDeReintentar({ ...cuota, retryAfter: '600' })).toBeNull();
  });

  it('no reintenta indefinidamente', () => {
    expect(esperaAntesDeReintentar({ ...cuota, intento: 3 })).toBeNull();
  });

  it('no reintenta otros errores', () => {
    expect(esperaAntesDeReintentar({ ...cuota, estado: 500 })).toBeNull();
  });
});
