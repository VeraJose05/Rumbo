// RF-05, RF-06, RF-07, RF-09: flow de planificación, probado con recuperador y modelo simulados.
import { Document, genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { PerfilSchema } from './perfil.js';
import { definirPlanificacionFlow } from './planificacion.js';

const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 2, intereses: ['naturaleza'], ritmo: 'tranquilo' });

const doc = (id: string, texto: string, seccion: string) =>
  Document.fromText(texto, {
    id,
    destino: 'Sevilla',
    seccion,
    fuente: 'Wikivoyage',
    url: 'https://es.wikivoyage.org/wiki/Sevilla',
    licencia: 'CC BY-SA 4.0',
  });

/** Modelo simulado que devuelve los días indicados, uno por llamada. */
function crearEntorno(respuestasDias: object[], documentos = [doc('s:1', '* Catedral de Sevilla - Gótica.', 'Ver'), doc('s:2', 'Parque de María Luisa.', 'Ver')]) {
  const peticiones: GenerateRequest[] = [];
  const consultas: { texto: string; opciones: unknown }[] = [];
  const ai = genkit({ model: 'simulado' });

  ai.defineModel({ name: 'simulado', supports: { constrained: 'all', output: ['json'] } }, async (peticion) => {
    const respuesta = respuestasDias[peticiones.length] ?? { manana: [], tarde: [], noche: [] };
    peticiones.push(peticion);
    return { message: { role: 'model', content: [{ text: JSON.stringify(respuesta) }] } };
  });
  const recuperador = ai.defineRetriever({ name: 'simulado' }, async (consulta, opciones) => {
    consultas.push({ texto: consulta.text, opciones });
    return { documents: documentos };
  });

  const textoDe = (p: GenerateRequest) => p.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
  return { flow: definirPlanificacionFlow(ai, recuperador), peticiones, consultas, textoDe };
}

const dia = (lugar: string, citas: number[]) => ({ manana: [{ lugar, descripcion: 'Visita.', citas }], tarde: [], noche: [] });

describe('planificacionFlow', () => {
  it('en C1 hace una búsqueda por consulta del perfil y genera un día por llamada', async () => {
    const { flow, consultas, peticiones } = crearEntorno([dia('Catedral de Sevilla', [1]), dia('Parque de María Luisa', [2])]);

    const salida = await flow({ perfil, modo: 'C1' });

    // Consulta base + naturaleza, repartiendo 12 fragmentos entre las dos.
    expect(consultas.map((c) => c.opciones)).toEqual([
      { k: 6, destino: 'Sevilla' },
      { k: 6, destino: 'Sevilla' },
    ]);
    expect(peticiones).toHaveLength(2);
    expect(salida.dias.map((d) => d.dia)).toEqual([1, 2]);
  });

  it('pasa al día siguiente los lugares ya usados', async () => {
    const { flow, peticiones, textoDe } = crearEntorno([dia('Catedral de Sevilla', [1]), dia('Parque de María Luisa', [2])]);

    await flow({ perfil, modo: 'C1' });

    expect(textoDe(peticiones[1]!)).toContain('ya incluidos en días anteriores: Catedral de Sevilla.');
  });

  it('verifica cada actividad contra los textos que cita y devuelve solo las fuentes citadas', async () => {
    const { flow } = crearEntorno([dia('Catedral de Sevilla', [1, 7]), dia('Torre del Oro', [2])]);

    const salida = await flow({ perfil, modo: 'C1' });

    expect(salida.hayInformacion).toBe(true);
    expect(salida.dias[0]?.manana).toEqual([
      { lugar: 'Catedral de Sevilla', descripcion: 'Visita.', citas: [1], verificada: true },
    ]);
    expect(salida.dias[1]?.manana[0]?.verificada).toBe(false);
    expect(salida.fuentes.map((f) => f.cita)).toEqual([1, 2]);
    expect(salida.fuentes[0]).toEqual({
      cita: 1,
      seccion: 'Ver',
      fuente: 'Wikivoyage',
      url: 'https://es.wikivoyage.org/wiki/Sevilla',
      licencia: 'CC BY-SA 4.0',
    });
  });

  it('en C0 no recupera nada, no pide citas y no puede verificar', async () => {
    const { flow, consultas, textoDe, peticiones } = crearEntorno([
      { manana: [{ lugar: 'Catedral', descripcion: 'Visita.' }], tarde: [], noche: [] },
    ]);

    const salida = await flow({ perfil: { ...perfil, dias: 1 }, modo: 'C0' });

    expect(consultas).toHaveLength(0);
    expect(textoDe(peticiones[0]!)).not.toContain('Textos:');
    expect(salida.dias[0]?.manana).toEqual([{ lugar: 'Catedral', descripcion: 'Visita.', citas: [], verificada: null }]);
    expect(salida.fuentes).toEqual([]);
  });

  it('en C1, si no hay fragmentos del destino, lo dice sin llamar al modelo (RF-07)', async () => {
    const { flow, peticiones } = crearEntorno([], []);

    const salida = await flow({ perfil: { ...perfil, destino: 'Bilbao' }, modo: 'C1' });

    expect(salida).toEqual({ modo: 'C1', hayInformacion: false, dias: [], fuentes: [] });
    expect(peticiones).toHaveLength(0);
  });
});
