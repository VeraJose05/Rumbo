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
function crearEntorno(
  respuestasDias: object[],
  documentos = [doc('s:1', '* Catedral de Sevilla - Gótica.', 'Ver'), doc('s:2', 'Parque de María Luisa.', 'Ver')],
  sinCobertura: (destino: string, intereses: string[]) => string[] = () => [],
  situar?: (lugar: string, destino: string) => { lat: number; lon: number } | null,
) {
  const peticiones: GenerateRequest[] = [];
  const consultas: { texto: string; opciones: unknown }[] = [];
  const ai = genkit({ model: 'simulado' });

  ai.defineModel({ name: 'simulado', supports: { constrained: 'all', output: ['json'] } }, async (peticion) => {
    const respuesta = respuestasDias[peticiones.length] ?? { actividades: [] };
    peticiones.push(peticion);
    return { message: { role: 'model', content: [{ text: JSON.stringify(respuesta) }] } };
  });
  const recuperador = ai.defineRetriever({ name: 'simulado' }, async (consulta, opciones) => {
    consultas.push({ texto: consulta.text, opciones });
    return { documents: documentos };
  });
  // El avanzado (C2) devuelve otro fragmento, para distinguir qué recuperador se usó.
  const consultasAvanzado: unknown[] = [];
  const recuperadorAvanzado = ai.defineRetriever({ name: 'simulado-avanzado' }, async (consulta, opciones) => {
    consultasAvanzado.push(opciones);
    return { documents: documentos.length ? [doc('s:9', '* Torre del Oro - Torre vigía.', 'Ver')] : [] };
  });

  const textoDe = (p: GenerateRequest) => p.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
  return { flow: definirPlanificacionFlow(ai, recuperador, recuperadorAvanzado, sinCobertura, situar), peticiones, consultas, consultasAvanzado, textoDe };
}

// El ritmo tranquilo pide 2 actividades por día: la indicada por la mañana y un paseo por la noche.
const dia = (lugar: string, citas: number[]) => ({
  actividades: [
    { franja: 'manana', lugar, descripcion: 'Visita.', citas },
    { franja: 'noche', lugar: `Paseo tras ${lugar}`, descripcion: 'Paseo.', citas: [2] },
  ],
});

describe('planificacionFlow', () => {
  it('en C1 hace una búsqueda por consulta del perfil y genera un día por llamada', async () => {
    const { flow, consultas, peticiones } = crearEntorno([dia('Catedral de Sevilla', [1]), dia('Parque de María Luisa', [2])]);

    const salida = await flow({ perfil, modo: 'C1' });

    // Consulta base + naturaleza: cada una pide el doble de su parte (12 / 2 × 2), porque las
    // consultas comparten fragmentos y al quitar repetidos quedarían menos de 12.
    expect(consultas.map((c) => c.opciones)).toEqual([
      { k: 12, destino: 'Sevilla' },
      { k: 12, destino: 'Sevilla' },
    ]);
    expect(peticiones).toHaveLength(2);
    expect(salida.dias.map((d) => d.dia)).toEqual([1, 2]);
  });

  it('pasa al día siguiente los lugares ya usados', async () => {
    const { flow, peticiones, textoDe } = crearEntorno([dia('Catedral de Sevilla', [1]), dia('Parque de María Luisa', [2])]);

    await flow({ perfil, modo: 'C1' });

    expect(textoDe(peticiones[1]!)).toContain(
      'ya incluidos en días anteriores: Catedral de Sevilla, Paseo tras Catedral de Sevilla.',
    );
  });

  it('verifica cada actividad contra los textos que cita y devuelve solo las fuentes citadas', async () => {
    const { flow } = crearEntorno([dia('Catedral de Sevilla', [1, 7]), dia('Torre del Oro', [2])]);

    const salida = await flow({ perfil, modo: 'C1' });

    expect(salida.hayInformacion).toBe(true);
    expect(salida.dias[0]?.manana).toEqual([
      { lugar: 'Catedral de Sevilla', descripcion: 'Visita.', citas: [1], verificacion: 'verificada' },
    ]);
    expect(salida.dias[1]?.manana[0]?.verificacion).toBe('sin-fuente');
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
      {
        actividades: [
          { franja: 'manana', lugar: 'Catedral', descripcion: 'Visita.' },
          { franja: 'tarde', lugar: 'Triana', descripcion: 'Paseo.' },
        ],
      },
    ]);

    const salida = await flow({ perfil: { ...perfil, dias: 1 }, modo: 'C0' });

    expect(consultas).toHaveLength(0);
    expect(textoDe(peticiones[0]!)).not.toContain('Textos:');
    expect(salida.dias[0]?.manana).toEqual([{ lugar: 'Catedral', descripcion: 'Visita.', citas: [], verificacion: null }]);
    expect(salida.fuentes).toEqual([]);
  });

  it('si al quitar repetidos faltan actividades, reintenta el día con la lista de lugares a evitar', async () => {
    const { flow, peticiones, textoDe } = crearEntorno([
      dia('Catedral de Sevilla', [1]),
      dia('Catedral de Sevilla', [1]), // repite los dos lugares del día 1
      dia('Parque de María Luisa', [2]),
    ]);

    const salida = await flow({ perfil, modo: 'C1' });

    expect(peticiones).toHaveLength(3);
    expect(textoDe(peticiones[2]!)).toContain('Catedral de Sevilla');
    expect(salida.dias[1]?.manana[0]?.lugar).toBe('Parque de María Luisa');
  });

  it('RF-14: descarta los lugares que no se pueden situar en el mapa y pide otros', async () => {
    const unDia = PerfilSchema.parse({ ...perfil, dias: 1 });
    // Cada lugar en un punto distinto, salvo «Bares de Nervión», que no está en el mapa.
    const enElMapa = (lugar: string) => (lugar === 'Bares de Nervión' ? null : { lat: lugar.length, lon: 0 });
    const { flow, peticiones, textoDe } = crearEntorno(
      [
        { actividades: [{ franja: 'manana', lugar: 'Catedral de Sevilla', descripcion: 'Visita.', citas: [1] }, { franja: 'noche', lugar: 'Bares de Nervión', descripcion: 'Tapas.', citas: [2] }] },
        // El modelo repite la Catedral (se descarta por repetida) y propone un sitio que sí está en el mapa.
        { actividades: [{ franja: 'manana', lugar: 'Catedral de Sevilla', descripcion: 'Visita.', citas: [1] }, { franja: 'noche', lugar: 'Parque de María Luisa', descripcion: 'Paseo.', citas: [2] }] },
      ],
      undefined,
      undefined,
      enElMapa,
    );

    const salida = await flow({ perfil: unDia, modo: 'C1' });

    expect(peticiones).toHaveLength(2);
    expect(textoDe(peticiones[1]!)).toContain('Bares de Nervión'); // en la lista de lugares a evitar
    expect(salida.dias[0]?.manana.map((a) => a.lugar)).toEqual(['Catedral de Sevilla']);
    expect(salida.dias[0]?.noche.map((a) => a.lugar)).toEqual(['Parque de María Luisa']);
  });

  it('RF-14: si tras los reintentos no hay sustituto, se queda el lugar sin situar antes que dejar el día corto', async () => {
    const unDia = PerfilSchema.parse({ ...perfil, dias: 1 });
    const respuesta = { actividades: [{ franja: 'manana', lugar: 'Catedral de Sevilla', descripcion: 'Visita.', citas: [1] }, { franja: 'noche', lugar: 'Bares de Nervión', descripcion: 'Tapas.', citas: [2] }] };
    const { flow, peticiones } = crearEntorno([respuesta, respuesta, respuesta], undefined, undefined, (lugar) => (lugar === 'Bares de Nervión' ? null : { lat: lugar.length, lon: 0 }));

    const salida = await flow({ perfil: unDia, modo: 'C1' });

    expect(peticiones).toHaveLength(3);
    expect(salida.dias[0]?.noche.map((a) => a.lugar)).toEqual(['Bares de Nervión']);
  });

  it('RF-14: en C0 no descarta nada (no usa la guía ni sus lugares)', async () => {
    const unDia = PerfilSchema.parse({ ...perfil, dias: 1 });
    const { flow, peticiones } = crearEntorno([dia('Lugar inventado', [])], undefined, undefined, () => null);

    await flow({ perfil: unDia, modo: 'C0' });

    expect(peticiones).toHaveLength(1);
  });

  it('RF-14: no repite el mismo sitio con otro nombre (la Catedral de Sevilla y la de Santa María de la Sede)', async () => {
    const CATEDRAL = { lat: 37.3858, lon: -5.9931 };
    const puntos: Record<string, { lat: number; lon: number }> = {
      'Catedral de Santa María de la Sede': CATEDRAL,
      'Catedral de Sevilla': { lat: 37.38591, lon: -5.99314 },
      'Torre del Oro': { lat: 37.3824, lon: -5.9963 },
      'Parque de María Luisa': { lat: 37.3747, lon: -5.9888 },
      'Plaza de España': { lat: 37.3772, lon: -5.9869 },
    };
    const visita = (manana: string, noche: string) => ({
      actividades: [{ franja: 'manana', lugar: manana, descripcion: 'Visita.', citas: [1] }, { franja: 'noche', lugar: noche, descripcion: 'Paseo.', citas: [2] }],
    });
    const { flow, peticiones } = crearEntorno(
      [visita('Catedral de Santa María de la Sede', 'Torre del Oro'), visita('Catedral de Sevilla', 'Parque de María Luisa'), visita('Plaza de España', 'Parque de María Luisa')],
      undefined,
      undefined,
      (lugar) => puntos[lugar] ?? null,
    );

    const salida = await flow({ perfil, modo: 'C1' });

    expect(peticiones).toHaveLength(3); // el día 2 se pide otra vez: la «Catedral de Sevilla» ya estaba
    const dia2 = [...salida.dias[1]!.manana, ...salida.dias[1]!.noche].map((a) => a.lugar);
    expect(dia2).not.toContain('Catedral de Sevilla');
    expect(dia2).toEqual(expect.arrayContaining(['Parque de María Luisa', 'Plaza de España']));
  });

  it('no reintenta más de dos veces', async () => {
    const repetido = dia('Catedral de Sevilla', [1]);
    const { flow, peticiones } = crearEntorno([repetido, repetido, repetido, repetido, repetido]);

    const salida = await flow({ perfil, modo: 'C1' });

    expect(peticiones).toHaveLength(4); // día 1 + día 2 con dos reintentos
    expect(salida.dias[1]).toEqual({ dia: 2, manana: [], tarde: [], noche: [] });
  });

  it('en C1, si no hay fragmentos del destino, lo dice sin llamar al modelo (RF-07)', async () => {
    const { flow, peticiones } = crearEntorno([], []);

    const salida = await flow({ perfil: { ...perfil, destino: 'Bilbao' }, modo: 'C1' });

    expect(salida).toEqual({ modo: 'C1', hayInformacion: false, dias: [], fuentes: [], interesesSinCobertura: [], recuperados: [] });
    expect(peticiones).toHaveLength(0);
  });

  it('devuelve los fragmentos recuperados, numerados como en el prompt, para registrarlos (RNF-04)', async () => {
    const { flow } = crearEntorno([dia('Catedral de Sevilla', [1]), dia('Parque de María Luisa', [2])]);

    const salida = await flow({ perfil, modo: 'C1' });

    expect(salida.recuperados).toEqual([
      { cita: 1, id: 's:1', seccion: 'Ver', texto: '* Catedral de Sevilla - Gótica.' },
      { cita: 2, id: 's:2', seccion: 'Ver', texto: 'Parque de María Luisa.' },
    ]);
  });

  it('en C0 no hay fragmentos recuperados', async () => {
    const { flow } = crearEntorno([dia('Catedral de Sevilla', []), dia('Parque de María Luisa', [])]);

    expect((await flow({ perfil, modo: 'C0' })).recuperados).toEqual([]);
  });

  it('en C2 usa el recuperador avanzado con las mismas consultas y el mismo prompt que C1 (RF-09)', async () => {
    const { flow, consultas, consultasAvanzado, peticiones, textoDe } = crearEntorno([dia('Torre del Oro', [1]), dia('Torre vigía', [1])]);

    const salida = await flow({ perfil, modo: 'C2' });

    expect(consultas).toHaveLength(0);
    expect(consultasAvanzado).toEqual([
      { k: 12, destino: 'Sevilla' },
      { k: 12, destino: 'Sevilla' },
    ]);
    expect(textoDe(peticiones[0]!)).toContain('[1] (Sevilla › Ver) * Torre del Oro - Torre vigía.');
    expect(salida.modo).toBe('C2');
    expect(salida.dias[0]?.manana[0]?.verificacion).toBe('verificada');
  });

  it('en C2, si no hay fragmentos del destino, tampoco planifica (RF-07)', async () => {
    const { flow, peticiones } = crearEntorno([], []);

    expect((await flow({ perfil: { ...perfil, destino: 'Bilbao' }, modo: 'C2' })).hayInformacion).toBe(false);
    expect(peticiones).toHaveLength(0);
  });
});

describe('planificacionFlow con intereses que la guía no cubre (RF-07)', () => {
  const playaYNaturaleza = PerfilSchema.parse({ destino: 'Sevilla', dias: 1, intereses: ['naturaleza', 'playa'], ritmo: 'tranquilo' });
  const sinPlaya = (_destino: string, intereses: string[]) => intereses.filter((i) => i === 'playa');

  it('no busca el interés sin cobertura, no se lo pide al modelo y lo devuelve', async () => {
    const { flow, consultas, peticiones, textoDe } = crearEntorno([dia('Catedral de Sevilla', [1])], undefined, sinPlaya);

    const salida = await flow({ perfil: playaYNaturaleza, modo: 'C1' });

    expect(consultas.map((c) => c.texto).join(' ')).not.toMatch(/playa/);
    expect(textoDe(peticiones[0]!)).not.toMatch(/playa/);
    expect(salida.interesesSinCobertura).toEqual(['playa']);
  });

  it('si no queda ningún interés cubierto, planifica lo imprescindible', async () => {
    const soloPlaya = PerfilSchema.parse({ destino: 'Sevilla', dias: 1, intereses: ['playa'], ritmo: 'tranquilo' });
    const { flow, consultas, peticiones, textoDe } = crearEntorno([dia('Catedral de Sevilla', [1])], undefined, sinPlaya);

    const salida = await flow({ perfil: soloPlaya, modo: 'C1' });

    expect(consultas).toHaveLength(1);
    expect(textoDe(peticiones[0]!)).toContain('Intereses: lo imprescindible');
    expect(salida.hayInformacion).toBe(true);
  });

  it('en C0 no filtra: no usa la guía', async () => {
    const { flow, peticiones, textoDe } = crearEntorno(
      [{ actividades: [{ franja: 'manana', lugar: 'Playa', descripcion: 'x' }, { franja: 'noche', lugar: 'Paseo', descripcion: 'y' }] }],
      undefined,
      sinPlaya,
    );

    const salida = await flow({ perfil: playaYNaturaleza, modo: 'C0' });

    expect(textoDe(peticiones[0]!)).toMatch(/playa/);
    expect(salida.interesesSinCobertura).toEqual([]);
  });
});
