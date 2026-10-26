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

function crearEntorno(respuestaModelo: string) {
  const peticiones: GenerateRequest[] = [];
  const opcionesRecuperacion: unknown[] = [];
  const ai = genkit({ model: 'simulado' });

  ai.defineModel({ name: 'simulado' }, async (peticion) => {
    peticiones.push(peticion);
    return { message: { role: 'model', content: [{ text: respuestaModelo }] } };
  });

  const recuperador = ai.defineRetriever({ name: 'simulado' }, async (_consulta, opciones) => {
    opcionesRecuperacion.push(opciones);
    return {
      documents: [
        Document.fromText('Los Coloniales es de altísima calidad.', metadatos('Comer')),
        Document.fromText('Sevilla tiene muchos bares.', metadatos('Beber')),
        Document.fromText('La Giralda mide 92 metros.', metadatos('Ver')),
      ],
    };
  });

  return { flow: definirPreguntaFlow(ai, recuperador), peticiones, opcionesRecuperacion };
}

describe('preguntaFlow', () => {
  it('recupera del destino pedido con k = 5 por defecto', async () => {
    const { flow, opcionesRecuperacion } = crearEntorno('Respuesta [1].');

    await flow({ pregunta: '¿Dónde cenar tapas?', destino: 'Sevilla' });

    expect(opcionesRecuperacion).toEqual([{ k: 5, destino: 'Sevilla' }]);
  });

  it('permite cambiar k', async () => {
    const { flow, opcionesRecuperacion } = crearEntorno('Respuesta [1].');

    await flow({ pregunta: '¿Dónde cenar tapas?', destino: 'Sevilla', k: 3 });

    expect(opcionesRecuperacion).toEqual([{ k: 3, destino: 'Sevilla' }]);
  });

  it('pasa los fragmentos recuperados al modelo', async () => {
    const { flow, peticiones } = crearEntorno('Respuesta [1].');

    await flow({ pregunta: '¿Dónde cenar tapas?', destino: 'Sevilla' });

    const textos = peticiones[0]?.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
    expect(textos).toContain('[1] (Sevilla › Comer) Los Coloniales es de altísima calidad.');
    expect(textos).toContain('Pregunta: ¿Dónde cenar tapas?');
  });

  it('devuelve la respuesta y solo las fuentes citadas', async () => {
    const { flow } = crearEntorno('Prueba Los Coloniales [1] y sube a la Giralda [3].');

    const salida = await flow({ pregunta: '¿Qué hago?', destino: 'Sevilla' });

    expect(salida).toEqual({
      respuesta: 'Prueba Los Coloniales [1] y sube a la Giralda [3].',
      fuentes: [
        { cita: 1, seccion: 'Comer', fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' },
        { cita: 3, seccion: 'Ver', fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' },
      ],
    });
  });
});
