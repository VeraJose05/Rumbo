// RF-01: flow de entrevista, probado con un modelo simulado.
import { genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { definirEntrevistaFlow } from './entrevista.js';

const sinDatos = { destino: null, dias: null, intereses: [], ritmo: null, presupuesto: null, compania: null };

/** Modelo simulado: devuelve la extracción indicada cuando se le pide JSON y una pregunta fija si no. */
function crearEntorno(extraccion: object = sinDatos) {
  const peticiones: GenerateRequest[] = [];
  const ai = genkit({ model: 'simulado' });
  ai.defineModel({ name: 'simulado', supports: { constrained: 'all', output: ['json', 'text'] } }, async (peticion) => {
    peticiones.push(peticion);
    const texto = peticion.output?.schema ? JSON.stringify(extraccion) : 'Pregunta del modelo';
    return { message: { role: 'model', content: [{ text: texto }] } };
  });
  const textoDe = (p: GenerateRequest) => p.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
  return { flow: definirEntrevistaFlow(ai), peticiones, textoDe };
}

describe('entrevistaFlow', () => {
  it('sin estado ni mensaje, saluda y ofrece los destinos disponibles sin llamar al modelo', async () => {
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ mensaje: '' });

    expect(salida).toEqual({
      estado: { perfil: {}, preguntados: ['destino'] },
      respuesta:
        '¡Hola! Soy Rumbo y te ayudo a planificar tu viaje. ¿A dónde quieres ir? Puedo ayudarte con Sevilla, Madrid, Barcelona, Granada y Valencia.',
      perfil: null,
    });
    expect(peticiones).toHaveLength(0);
  });

  it('pregunta los días con el destino ya conocido', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Granada' });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Granada' });

    expect(salida.respuesta).toBe('¿Cuántos días vas a estar en Granada? Puedo planificar de 1 a 7.');
  });

  it('guarda lo extraído del mensaje y pregunta por lo siguiente que falta', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, destino: 'Sevilla', dias: 3 });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Sevilla, 3 días' });

    expect(salida.estado.perfil).toEqual({ destino: 'Sevilla', dias: 3 });
    expect(salida.perfil).toBeNull();
    // La pregunta de intereses es un texto fijo: solo se llama al modelo para extraer.
    expect(peticiones).toHaveLength(1);
    expect(salida.respuesta).toBe(
      '¿Qué te gustaría hacer en Sevilla? Puedes elegir varios: monumentos, museos, gastronomía, naturaleza, ocio nocturno, compras, playa, niños.',
    );
  });

  it('si el destino no tiene guía, no avanza: lo dice y vuelve a pedir el destino', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, destino: 'Japón', dias: 5 });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'A Japón, 5 días' });

    expect(salida.estado.perfil).toEqual({ dias: 5 });
    expect(salida.respuesta).toMatch(/^Lo siento, todavía no tengo información de Japón\./);
    expect(salida.perfil).toBeNull();
    // Solo la extracción: la respuesta es un texto fijo.
    expect(peticiones).toHaveLength(1);
  });

  it('indica al extractor qué se acababa de preguntar, para entender respuestas cortas como «3»', async () => {
    const { flow, peticiones, textoDe } = crearEntorno();

    await flow({ estado: { perfil: { destino: 'Sevilla' }, preguntados: ['destino', 'dias'] }, mensaje: '3' });

    expect(textoDe(peticiones[0]!)).toMatch(/Se le acaba de preguntar por: dias/);
  });

  it('con lo obligatorio completo, pregunta una vez por los opcionales con un texto fijo', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, intereses: ['museos'] });

    const salida = await flow({
      estado: { perfil: { destino: 'Sevilla', dias: 2 }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'Me gustan los museos',
    });

    expect(salida.estado.preguntados).toEqual(['destino', 'dias', 'intereses', 'opcionales']);
    expect(salida.perfil).toBeNull();
    expect(salida.respuesta).toMatch(/^¿Quieres contarme algo más\?/);
    expect(peticiones).toHaveLength(1);
  });

  it('tras los opcionales termina con el perfil válido y un resumen, sin redactar más preguntas', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, compania: 'pareja' });

    const salida = await flow({
      estado: {
        perfil: { destino: 'Sevilla', dias: 2, intereses: ['museos'] },
        preguntados: ['destino', 'dias', 'intereses', 'opcionales'],
      },
      mensaje: 'Voy con mi pareja',
    });

    expect(salida.perfil).toEqual({
      destino: 'Sevilla',
      dias: 2,
      intereses: ['museos'],
      ritmo: 'normal',
      presupuesto: 'medio',
      compania: 'pareja',
    });
    expect(salida.respuesta).toMatch(/Sevilla, 2 días, en pareja/);
    expect(peticiones).toHaveLength(1);
  });
});
