// RF-11: flow de ajuste del itinerario por chat, probado con modelo y recuperador simulados.
import { Document, genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { definirAjusteFlow } from './ajuste.js';
import { PerfilSchema } from './perfil.js';
import type { Itinerario } from './planificacion.js';

const metadatos = { fuente: 'Wikivoyage', url: 'https://es.wikivoyage.org/wiki/Sevilla', licencia: 'CC BY-SA 4.0' };
const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 2, intereses: ['monumentos'], ritmo: 'tranquilo' });

const actividad = (lugar: string, citas: number[]) => ({ lugar, descripcion: `Visita a ${lugar}.`, citas, verificacion: 'verificada' as const });
const itinerario: Itinerario = {
  modo: 'C1',
  hayInformacion: true,
  dias: [
    { dia: 1, manana: [actividad('Catedral de Sevilla', [1])], tarde: [], noche: [actividad('Barrio de Santa Cruz', [2])] },
    { dia: 2, manana: [actividad('Reales Alcázares', [2])], tarde: [], noche: [actividad('Plaza de España', [1])] },
  ],
  fuentes: [{ cita: 1, seccion: 'Ver', ...metadatos }],
  interesesSinCobertura: [],
  recuperados: [
    { cita: 1, id: 's:1', seccion: 'Ver', texto: 'Catedral de Sevilla. Plaza de España.' },
    { cita: 2, id: 's:2', seccion: 'Ver', texto: 'Barrio de Santa Cruz. Reales Alcázares.' },
  ],
};

/** Modelo simulado: devuelve tantas actividades nuevas como pide el esquema, citando el texto 1. */
function crearEntorno(sinCobertura: (destino: string, intereses: string[]) => string[] = () => []) {
  const peticiones: GenerateRequest[] = [];
  const consultas: string[] = [];
  const ai = genkit({ model: 'simulado' });
  ai.defineModel({ name: 'simulado', supports: { constrained: 'all', output: ['json'] } }, async (peticion) => {
    peticiones.push(peticion);
    const esquema = peticion.output?.schema as { properties: { actividades: { minItems: number } } };
    const franjas = ['manana', 'tarde', 'noche'];
    const actividades = Array.from({ length: esquema.properties.actividades.minItems }, (_, i) => ({
      franja: franjas[i % 3],
      lugar: `Nuevo ${peticiones.length}-${i}`,
      descripcion: 'Nueva.',
      citas: [1],
    }));
    return { message: { role: 'model', content: [{ text: JSON.stringify({ actividades }) }] } };
  });
  const recuperador = ai.defineRetriever({ name: 'simulado' }, async (consulta) => {
    consultas.push(consulta.text);
    return { documents: [Document.fromText('Playa artificial del río.', { id: 's:9', seccion: 'Hacer', ...metadatos })] };
  });
  return { flow: definirAjusteFlow(ai, recuperador, undefined, sinCobertura), peticiones, consultas };
}

const lugaresDe = (it: Itinerario, dia: number) => {
  const d = it.dias.find((x) => x.dia === dia)!;
  return [...d.manana, ...d.tarde, ...d.noche].map((a) => a.lugar);
};

describe('ajusteFlow', () => {
  it('quitar un lugar rehace solo su día; el otro queda igual', async () => {
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ perfil, itinerario, mensaje: 'quita la Catedral' });

    expect(peticiones).toHaveLength(1);
    expect(lugaresDe(salida.itinerario, 1)).not.toContain('Catedral de Sevilla');
    expect(salida.itinerario.dias[1]).toEqual(itinerario.dias[1]);
    expect(salida.respuesta).toBe('Hecho: he quitado Catedral de Sevilla. He rehecho el día 1; el resto se queda igual.');
  });

  it('al rehacer un día evita los lugares de los demás días y los que se han quitado', async () => {
    const { flow, peticiones } = crearEntorno();

    await flow({ perfil, itinerario, mensaje: 'quita la Catedral' });

    const prompt = peticiones[0]!.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
    expect(prompt).toContain('Reales Alcázares');
    expect(prompt).toContain('Catedral de Sevilla');
  });

  it('los lugares quitados no vuelven en ajustes posteriores', async () => {
    // Caso real: tras «quita la Catedral», «más tranquilo» rehacía todos los días y la volvía a poner.
    const { flow, peticiones } = crearEntorno();

    const primera = await flow({ perfil, itinerario, mensaje: 'quita la Catedral' });
    const segunda = await flow({ perfil: primera.perfil, itinerario: primera.itinerario, quitados: primera.quitados, mensaje: 'más intenso' });

    expect(primera.quitados).toEqual(['Catedral de Sevilla']);
    expect(segunda.quitados).toEqual(['Catedral de Sevilla']);
    const prompts = peticiones.slice(1).map((p) => p.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n'));
    for (const prompt of prompts) expect(prompt).toContain('Catedral de Sevilla');
  });

  it('cambiar el ritmo rehace todos los días con el ritmo nuevo', async () => {
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ perfil, itinerario, mensaje: 'más intenso' });

    expect(salida.perfil.ritmo).toBe('normal');
    expect(peticiones).toHaveLength(2);
    expect(salida.respuesta).toBe('Hecho: ahora con ritmo normal. He rehecho todos los días.');
  });

  it('un día menos quita el último sin llamar al modelo', async () => {
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ perfil, itinerario, mensaje: 'un día menos' });

    expect(salida.itinerario.dias).toEqual([itinerario.dias[0]]);
    expect(salida.perfil.dias).toBe(1);
    expect(peticiones).toHaveLength(0);
  });

  it('un día más genera solo el día nuevo', async () => {
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ perfil, itinerario, mensaje: 'un día más' });

    expect(peticiones).toHaveLength(1);
    expect(salida.itinerario.dias.slice(0, 2)).toEqual(itinerario.dias);
    expect(salida.itinerario.dias[2]!.dia).toBe(3);
    expect(salida.respuesta).toBe('Hecho: ahora son 3 días. He añadido el día 3; el resto se queda igual.');
  });

  it('añadir un interés recupera fragmentos nuevos sin cambiar la numeración de los anteriores', async () => {
    const { flow, consultas } = crearEntorno();

    const salida = await flow({ perfil, itinerario, mensaje: 'añade playa' });

    expect(consultas).toHaveLength(1);
    expect(salida.itinerario.recuperados.slice(0, 2).map((r) => r.id)).toEqual(['s:1', 's:2']);
    expect(salida.itinerario.recuperados[2]!.id).toBe('s:9');
    expect(salida.perfil.intereses).toEqual(['monumentos', 'playa']);
  });

  it('un interés que la guía no cubre no se añade y se avisa', async () => {
    const { flow, peticiones } = crearEntorno((_d, intereses) => intereses.filter((i) => i === 'playa'));

    const salida = await flow({ perfil, itinerario, mensaje: 'añade playa' });

    expect(salida.perfil.intereses).toEqual(['monumentos']);
    expect(peticiones).toHaveLength(0);
    expect(salida.respuesta).toBe('La guía de Sevilla no habla de playa, así que no puedo añadirlo.');
  });

  it('si no entiende la petición, lo dice y no cambia nada', async () => {
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ perfil, itinerario, mensaje: 'me encanta, gracias' });

    expect(salida.itinerario).toEqual(itinerario);
    expect(peticiones).toHaveLength(0);
    expect(salida.respuesta).toMatch(/^No he entendido qué quieres cambiar/);
  });
});
