// RF-04, RF-06: flow de pregunta con RAG, probado con recuperador y modelo simulados.
import { Document, genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { definirPreguntaFlow } from './pregunta.js';

const metadatos = (seccion: string) => ({
  destino: 'Sevilla',
  seccion,
  fuente: 'Wikivoyage',
  url: 'https://es.wikivoyage.org/wiki/Sevilla',
  licencia: 'CC BY-SA 4.0',
});

function crearEntorno(salidaModelo: object) {
  const peticiones: GenerateRequest[] = [];
  const opcionesRecuperacion: unknown[] = [];
  const ai = genkit({ model: 'simulado' });

  ai.defineModel({ name: 'simulado', supports: { constrained: 'all', output: ['json'] } }, async (peticion) => {
    peticiones.push(peticion);
    return { message: { role: 'model', content: [{ text: JSON.stringify(salidaModelo) }] } };
  });

  const recuperador = ai.defineRetriever({ name: 'simulado' }, async (_consulta, opciones) => {
    opcionesRecuperacion.push(opciones);
    return {
      documents: [
        Document.fromText('Los Coloniales es de altísima calidad.', metadatos('Comer')),
        Document.fromText('Sevilla tiene muchos bares.', metadatos('Beber')),
        Document.fromText('* La Giralda - Antiguo minarete de 92 metros.', metadatos('Ver')),
      ],
    };
  });

  return { flow: definirPreguntaFlow(ai, recuperador), peticiones, opcionesRecuperacion };
}

const sinInformacion = { hayInformacion: false, recomendaciones: [], respuesta: 'No tengo información.' };

describe('preguntaFlow', () => {
  it('recupera del destino pedido con k = 5 por defecto, o con el k indicado', async () => {
    const { flow, opcionesRecuperacion } = crearEntorno(sinInformacion);

    await flow({ pregunta: '¿Qué hago?', destino: 'Sevilla' });
    await flow({ pregunta: '¿Qué hago?', destino: 'Sevilla', k: 3 });

    expect(opcionesRecuperacion).toEqual([
      { k: 5, destino: 'Sevilla' },
      { k: 3, destino: 'Sevilla' },
    ]);
  });

  it('pasa los fragmentos al modelo y le pide salida con esquema', async () => {
    const { flow, peticiones } = crearEntorno(sinInformacion);

    await flow({ pregunta: '¿Dónde cenar tapas?', destino: 'Sevilla' });

    const textos = peticiones[0]?.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
    expect(textos).toContain('[1] (Sevilla › Comer) Los Coloniales es de altísima calidad.');
    expect(textos).toContain('Pregunta: ¿Dónde cenar tapas?');
    expect(peticiones[0]?.output?.schema).toBeDefined();
  });

  it('devuelve las recomendaciones verificadas contra sus citas y solo las fuentes citadas', async () => {
    const { flow } = crearEntorno({
      hayInformacion: true,
      recomendaciones: [
        { lugar: 'La Giralda', detalle: 'Minarete de 92 metros', citas: [3, 9] },
        { lugar: 'Reales Alcázares', detalle: 'Palacio árabe', citas: [1] },
      ],
      respuesta: 'Sube a la Giralda.',
    });

    const salida = await flow({ pregunta: '¿Qué ver?', destino: 'Sevilla' });

    expect(salida).toEqual({
      hayInformacion: true,
      respuesta: 'Sube a la Giralda.',
      recomendaciones: [
        { lugar: 'La Giralda', detalle: 'Minarete de 92 metros', citas: [3], verificada: true },
        { lugar: 'Reales Alcázares', detalle: 'Palacio árabe', citas: [1], verificada: false },
      ],
      fuentes: [
        { cita: 1, seccion: 'Comer', fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' },
        { cita: 3, seccion: 'Ver', fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' },
      ],
    });
  });

  it('sin información no devuelve recomendaciones ni fuentes', async () => {
    const { flow } = crearEntorno(sinInformacion);

    const salida = await flow({ pregunta: '¿Hay escape rooms?', destino: 'Sevilla' });

    expect(salida).toEqual({ ...sinInformacion, fuentes: [] });
  });
});
