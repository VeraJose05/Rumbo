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
  it('sin estado ni mensaje, saluda y pregunta el destino sin extraer nada', async () => {
    const { flow, peticiones, textoDe } = crearEntorno();

    const salida = await flow({ mensaje: '' });

    expect(salida).toEqual({
      estado: { perfil: {}, preguntados: ['destino'] },
      respuesta: 'Pregunta del modelo',
      perfil: null,
    });
    expect(peticiones).toHaveLength(1);
    expect(textoDe(peticiones[0]!)).toMatch(/destino/);
  });

  it('guarda lo extraído del mensaje y pregunta por lo siguiente que falta', async () => {
    const { flow, peticiones, textoDe } = crearEntorno({ ...sinDatos, destino: 'Sevilla', dias: 3 });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Sevilla, 3 días' });

    expect(salida.estado.perfil).toEqual({ destino: 'Sevilla', dias: 3 });
    expect(salida.perfil).toBeNull();
    // La segunda llamada redacta la pregunta por los intereses; las opciones las añade el código.
    expect(textoDe(peticiones[1]!)).toMatch(/intereses/);
    expect(salida.respuesta).toBe(
      'Pregunta del modelo Puedes elegir varios: monumentos, museos, gastronomía, naturaleza, ocio nocturno, compras, playa, niños.',
    );
  });

  it('avisa delante de la pregunta si el destino no tiene guía', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Bilbao' });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'A Bilbao' });

    expect(salida.estado.perfil).toEqual({ destino: 'Bilbao' });
    expect(salida.respuesta).toMatch(/^Aviso: todavía no tengo información de Bilbao\.[\s\S]*Pregunta del modelo$/);
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
