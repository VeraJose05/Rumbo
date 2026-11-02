// RF-01: flow de entrevista, probado con un modelo simulado.
import { genkit, type GenerateRequest } from 'genkit';
import { describe, expect, it } from 'vitest';
import { definirEntrevistaFlow, type DependenciasEntrevista, type ResponderPregunta } from './entrevista.js';

const sinDatos = {
  destino: null,
  dias: null,
  intereses: [],
  interesesQuitar: [],
  ritmo: null,
  presupuesto: null,
  compania: null,
};
const completo = { destino: 'Sevilla', dias: 2, intereses: ['museos'] };
const todoPreguntado = ['destino', 'dias', 'intereses', 'opcionales'];
const confirmando = [...todoPreguntado, 'confirmacion'];

/** Modelo simulado: devuelve la extracción indicada cuando se le pide JSON y la pregunta indicada si no. */
function crearEntorno(extraccion: object = sinDatos, redaccion = '¡Genial! ¿Pregunta del modelo?', dependencias: DependenciasEntrevista = {}) {
  const peticiones: GenerateRequest[] = [];
  const ai = genkit({ model: 'simulado' });
  ai.defineModel({ name: 'simulado', supports: { constrained: 'all', output: ['json', 'text'] } }, async (peticion) => {
    peticiones.push(peticion);
    const texto = peticion.output?.schema ? JSON.stringify(extraccion) : redaccion;
    return { message: { role: 'model', content: [{ text: texto }] } };
  });
  const textoDe = (p: GenerateRequest) => p.messages.flatMap((m) => m.content.map((c) => c.text ?? '')).join('\n');
  return { flow: definirEntrevistaFlow(ai, dependencias), peticiones, textoDe };
}

describe('entrevistaFlow', () => {
  it('sin estado ni mensaje, saluda con un texto fijo, sin llamar al modelo', async () => {
    // Caso real: el modelo saludaba con «¡Bienvenido Rumbo!», como si Rumbo fuera el viajero.
    const { flow, peticiones } = crearEntorno();

    const salida = await flow({ mensaje: '' });

    const respuesta =
      '¡Hola! Bienvenido a Rumbo, te ayudo a planificar tu viaje. ¿A dónde te gustaría ir? Puedo ayudarte con Sevilla, Madrid, Barcelona, Granada y Valencia.';
    expect(salida).toEqual({
      estado: { perfil: {}, preguntados: ['destino'], historial: [{ rol: 'rumbo', texto: respuesta }] },
      respuesta,
      perfil: null,
      respaldo: null,
    });
    expect(peticiones).toHaveLength(0);
  });

  it('si la redacción del modelo menciona un destino nuevo, usa el texto de reserva', async () => {
    const { flow } = crearEntorno(sinDatos, '¿Te apuntas a un viaje al Caribe?');

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'no sé' });

    expect(salida.respuesta).toBe('¿A dónde quieres ir? Puedo ayudarte con Sevilla, Madrid, Barcelona, Granada y Valencia.');
    expect(salida.respaldo).toBe('nombre no permitido: Caribe');
  });

  it('si el modelo solo reacciona sin preguntar, añade la pregunta de reserva tras su frase', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Granada' }, '¡Granada es preciosa!');

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Granada' });

    expect(salida.respuesta).toBe('¡Granada es preciosa! ¿Cuántos días vas a estar en Granada?');
    expect(salida.respaldo).toBeNull();
  });

  it('un lugar mencionado al responder otra pregunta no se toma como cambio de destino', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Alhambra', intereses: ['monumentos', 'gastronomia'] });

    const salida = await flow({
      estado: { perfil: { destino: 'Granada', dias: 3 }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'la Alhambra y comer bien',
    });

    expect(salida.estado.perfil).toEqual({ destino: 'Granada', dias: 3, intereses: ['monumentos', 'gastronomia'] });
    expect(salida.respuesta).not.toMatch(/no tengo información/);
  });

  it('pregunta los días con el destino ya conocido', async () => {
    const { flow, peticiones, textoDe } = crearEntorno({ ...sinDatos, destino: 'Granada' });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Granada' });

    expect(textoDe(peticiones[1]!)).toContain('cuántos días va a estar en Granada');
    // La primera vez pregunta el modelo con sus palabras, sin opciones pegadas detrás.
    expect(salida.respuesta).toBe('¡Genial! ¿Pregunta del modelo?');
  });

  it('guarda lo extraído del mensaje y pregunta por lo siguiente que falta', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, destino: 'Sevilla', dias: 3 });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Sevilla, 3 días' });

    expect(salida.estado.perfil).toEqual({ destino: 'Sevilla', dias: 3 });
    expect(salida.perfil).toBeNull();
    expect(peticiones).toHaveLength(2);
    expect(salida.respuesta).toBe('¡Genial! ¿Pregunta del modelo?');
  });

  it('si el viajero no contesta a lo preguntado, vuelve a preguntarlo y añade las opciones', async () => {
    // Caso real: «no sé, ¿cuántos días hacen falta?» respondiendo a los días.
    const { flow } = crearEntorno(sinDatos);

    const salida = await flow({
      estado: { perfil: { destino: 'Granada', dias: 3 }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'no sé, la verdad',
    });

    expect(salida.respuesta).toBe(
      '¡Genial! ¿Pregunta del modelo? Puedes elegir varios: monumentos, museos, gastronomía, naturaleza, ocio nocturno, compras, playa, niños.',
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

  it('con lo obligatorio completo, pregunta una vez por los opcionales', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, intereses: ['museos'] });

    const salida = await flow({
      estado: { perfil: { destino: 'Sevilla', dias: 2 }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'Me gustan los museos',
    });

    expect(salida.estado.preguntados).toEqual(['destino', 'dias', 'intereses', 'opcionales']);
    expect(salida.perfil).toBeNull();
    // Pregunta solo el código: del modelo se queda su reacción, sin su pregunta.
    expect(salida.respuesta).toMatch(/^¡Genial! ¿Quieres contarme algo más\? Por ejemplo, con quién viajas/);
    expect(peticiones).toHaveLength(2);
  });

  it('en la pregunta de opcionales solo ofrece los que faltan', async () => {
    // Caso real: «4 días, con mi esposa y mis dos hijos» ya dio la compañía.
    const { flow } = crearEntorno({ ...sinDatos, intereses: ['monumentos', 'gastronomia'] });

    const salida = await flow({
      estado: { perfil: { destino: 'Sevilla', dias: 4, compania: 'familia' }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'quiero ver monumentos y probar las tapas',
    });

    expect(salida.respuesta).toContain('qué ritmo prefieres');
    expect(salida.respuesta).toContain('tu presupuesto');
    expect(salida.respuesta).not.toContain('con quién viajas');
  });

  it('no guarda ritmo ni presupuesto que el viajero no ha dicho, aunque el modelo los extraiga', async () => {
    // Caso real: el extractor rellenaba «normal» y «medio» por su cuenta.
    const { flow } = crearEntorno({
      ...sinDatos,
      destino: 'Sevilla',
      dias: 4,
      compania: 'pareja',
      intereses: ['playa', 'gastronomia', 'monumentos'],
      ritmo: 'normal',
      presupuesto: 'medio',
    });

    const salida = await flow({
      estado: { perfil: {}, preguntados: ['destino'] },
      mensaje: 'quiero ir a sevilla unos 4-5 dias, con mi pareja, nos interesa la playa las tapas y los monumentos',
    });

    expect(salida.estado.perfil).toEqual({ destino: 'Sevilla', dias: 4, compania: 'pareja', intereses: ['playa', 'gastronomia', 'monumentos'] });
    expect(salida.respuesta).toContain('qué ritmo prefieres');
  });

  it('guarda solo los intereses de los que habla el viajero y traduce «cultura»', async () => {
    // Caso real: «la comida y la cultura» salía como gastronomía y naturaleza.
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Granada', dias: 4, compania: 'familia', intereses: ['gastronomia', 'naturaleza'] });

    const salida = await flow({
      estado: { perfil: {}, preguntados: ['destino'] },
      mensaje: 'quiero viajar a granada con mi familia, 4 dias y nos gusta la comida y la cultura',
    });

    expect(salida.estado.perfil.intereses).toEqual(['gastronomia', 'monumentos', 'museos']);
  });

  it('no saluda en mitad de la conversación aunque el modelo lo haga', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Sevilla' }, 'Hola, ¿cuántos días vas a estar?');

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Sevilla' });

    expect(salida.respuesta).toBe('¿Cuántos días vas a estar?');
  });

  it('en los opcionales, si el modelo solo pregunta, queda solo la pregunta fija', async () => {
    const { flow } = crearEntorno({ ...sinDatos, intereses: ['museos'] }, '¿Hay algo específico que quieras incluir en tu viaje?');

    const salida = await flow({
      estado: { perfil: { destino: 'Sevilla', dias: 2 }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'Me gustan los museos',
    });

    expect(salida.respuesta).toMatch(/^¿Quieres contarme algo más\? Por ejemplo/);
  });

  it('en los opcionales, al modelo se le pide solo una reacción, sin preguntar', async () => {
    const { flow, peticiones, textoDe } = crearEntorno({ ...sinDatos, intereses: ['museos'] });

    await flow({
      estado: { perfil: { destino: 'Sevilla', dias: 2 }, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'Me gustan los museos',
    });

    expect(textoDe(peticiones.at(-1)!)).toContain('sin preguntar nada');
  });

  it('en la confirmación marca los datos que el viajero no ha dado', async () => {
    const { flow } = crearEntorno(sinDatos);

    const salida = await flow({
      estado: { perfil: { destino: 'Sevilla', dias: 4, compania: 'pareja', intereses: ['playa'] }, preguntados: ['destino', 'opcionales'] },
      mensaje: 'nada más',
    });

    expect(salida.respuesta).toContain('ritmo normal (por defecto), presupuesto medio (por defecto)');
  });

  it('tras los opcionales pide confirmar el perfil, sin terminar todavía', async () => {
    const { flow } = crearEntorno({ ...sinDatos, compania: 'pareja' });

    const salida = await flow({ estado: { perfil: completo, preguntados: todoPreguntado }, mensaje: 'Voy con mi pareja' });

    expect(salida.perfil).toBeNull();
    expect(salida.respuesta).toBe(
      'Esto es lo que he entendido: Sevilla, 2 días, en pareja, ritmo normal (por defecto), presupuesto medio (por defecto). Intereses: museos. ¿Es correcto, o quieres cambiar algo?',
    );
    expect(salida.estado.preguntados.at(-1)).toBe('confirmacion');
  });

  it('si el viajero confirma con un «sí», termina con el perfil sin llamar al modelo', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, compania: 'amigos' });

    const salida = await flow({ estado: { perfil: completo, preguntados: confirmando }, mensaje: 'sí, perfecto' });

    expect(salida.perfil).toEqual({ ...completo, ritmo: 'normal', presupuesto: 'medio', compania: 'solo' });
    expect(salida.respuesta).toMatch(/^¡Perfecto!/);
    expect(peticiones).toHaveLength(0);
  });

  it('una frase sin cambios que no es un simple «sí» no confirma: pregunta qué cambiar', async () => {
    const { flow } = crearEntorno();

    const salida = await flow({ estado: { perfil: completo, preguntados: confirmando }, mensaje: 'me parece estupendo así' });

    expect(salida.perfil).toBeNull();
    expect(salida.respuesta).toBe('Vale, ¿qué quieres cambiar? Si está todo bien, dime «sí».');
  });

  it('el extractor recibe los datos que ya se conocen, para entender correcciones', async () => {
    const { flow, peticiones, textoDe } = crearEntorno({ ...sinDatos, dias: 3 });

    await flow({ estado: { perfil: completo, preguntados: confirmando }, mensaje: 'mejor 3 días' });

    expect(textoDe(peticiones[0]!)).toContain('Datos que ya se conocen: {"destino":"Sevilla","dias":2,"intereses":["museos"]}');
  });

  it('si el viajero corrige algo, lo aplica y vuelve a confirmar', async () => {
    const { flow } = crearEntorno({ ...sinDatos, dias: 3 });

    const salida = await flow({ estado: { perfil: completo, preguntados: confirmando }, mensaje: 'mejor 3 días' });

    expect(salida.perfil).toBeNull();
    expect(salida.estado.perfil).toEqual({ ...completo, dias: 3 });
    expect(salida.respuesta).toMatch(/^Hecho, ahora queda así: Sevilla, 3 días/);
  });

  it('solo quita intereses al corregir en la confirmación', async () => {
    const { flow } = crearEntorno({ ...sinDatos, interesesQuitar: ['museos'] });

    const salida = await flow({
      estado: { perfil: completo, preguntados: ['destino', 'dias', 'intereses'] },
      mensaje: 'nada más',
    });

    expect(salida.estado.perfil).toEqual(completo);
  });

  it('añade al historial el mensaje del viajero y la respuesta de Rumbo', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Granada' });
    const historial = [{ rol: 'rumbo' as const, texto: '¿A dónde quieres ir?' }];

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'], historial }, mensaje: 'Granada' });

    expect(salida.estado.historial).toEqual([
      ...historial,
      { rol: 'viajero', texto: 'Granada' },
      { rol: 'rumbo', texto: salida.respuesta },
    ]);
  });

  it('también guarda en el historial las respuestas fijas, como la confirmación', async () => {
    const { flow } = crearEntorno({ ...sinDatos, compania: 'pareja' });

    const salida = await flow({ estado: { perfil: completo, preguntados: todoPreguntado }, mensaje: 'Voy con mi pareja' });

    expect(salida.estado.historial?.at(-1)).toEqual({ rol: 'rumbo', texto: salida.respuesta });
  });

  it('el modelo que redacta recibe la conversación anterior como mensajes de chat', async () => {
    const { flow, peticiones } = crearEntorno({ ...sinDatos, destino: 'Granada' });
    const historial = [
      { rol: 'rumbo' as const, texto: '¡Hola! ¿A dónde te apetece viajar?' },
      { rol: 'viajero' as const, texto: 'Estoy dudando entre varias ciudades' },
      { rol: 'rumbo' as const, texto: '¿Cuál te llama más?' },
    ];

    await flow({ estado: { perfil: {}, preguntados: ['destino'], historial }, mensaje: 'Granada' });

    // peticiones[0] es la extracción; peticiones[1], la redacción.
    const mensajes = peticiones[1]!.messages.filter((m) => m.role !== 'system');
    expect(mensajes.slice(0, 3).map((m) => [m.role, m.content[0]?.text])).toEqual([
      ['model', '¡Hola! ¿A dónde te apetece viajar?'],
      ['user', 'Estoy dudando entre varias ciudades'],
      ['model', '¿Cuál te llama más?'],
    ]);
  });

  it('si dice que no pero no indica qué cambiar, le pregunta qué quiere cambiar', async () => {
    const { flow } = crearEntorno();

    const salida = await flow({ estado: { perfil: completo, preguntados: confirmando }, mensaje: 'no' });

    expect(salida.perfil).toBeNull();
    expect(salida.respuesta).toBe('Vale, ¿qué quieres cambiar? Si está todo bien, dime «sí».');
  });
});

describe('entrevistaFlow con preguntas del viajero', () => {
  const URL = 'https://es.wikivoyage.org/wiki/Granada';
  /** Guía simulada que apunta lo que se le pregunta. */
  function guia(hayInformacion = true) {
    const llamadas: [string, string][] = [];
    const responder: ResponderPregunta = async (pregunta, destino) => {
      llamadas.push([pregunta, destino]);
      return hayInformacion
        ? { hayInformacion, respuesta: 'Con dos o tres días ves la Alhambra y el Albaicín.', fuentes: [{ url: URL }] }
        : { hayInformacion, respuesta: 'No tengo información.', fuentes: [] };
    };
    return { responder, llamadas };
  }
  const enGranada = { perfil: { destino: 'Granada' }, preguntados: ['destino', 'dias'] };

  it('contesta con la guía lo que pregunta el viajero y luego retoma lo que falta', async () => {
    const { responder, llamadas } = guia();
    const { flow, peticiones, textoDe } = crearEntorno(sinDatos, '¿Cuántos días te planteas?', { responder });

    const salida = await flow({ estado: enGranada, mensaje: 'no sé, ¿cuántos días hacen falta para verla bien?' });

    expect(llamadas).toEqual([['no sé, ¿cuántos días hacen falta para verla bien?', 'Granada']]);
    expect(salida.respuesta).toMatch(
      /^Con dos o tres días ves la Alhambra y el Albaicín\. \(\[Wikivoyage\]\(https:\/\/es\.wikivoyage\.org\/wiki\/Granada\)\) ¿Cuántos días te planteas\?/,
    );
    // El modelo que redacta sabe lo que ya se ha contestado, para no volver a hacerlo.
    expect(textoDe(peticiones.at(-1)!)).toContain('Ya le has contestado: «Con dos o tres días');
  });

  it('el modelo puede repetir los lugares de la respuesta de la guía sin que salte el guardarraíl', async () => {
    const { responder } = guia();
    const { flow } = crearEntorno(sinDatos, 'La Alhambra merece la pena. ¿Cuántos días te planteas?', { responder });

    const salida = await flow({ estado: enGranada, mensaje: '¿qué es lo más importante?' });

    expect(salida.respaldo).toBeNull();
  });

  it('si la guía no tiene información, no añade su respuesta', async () => {
    const { responder } = guia(false);
    const { flow } = crearEntorno(sinDatos, '¿Cuántos días te planteas?', { responder });

    const salida = await flow({ estado: enGranada, mensaje: '¿hay playa?' });

    expect(salida.respuesta).toMatch(/^¿Cuántos días te planteas\?/);
  });

  it('una pregunta sin datos nuevos no da por contestados los opcionales: los vuelve a preguntar', async () => {
    // Caso real: «qué se puede comer allí?» respondiendo a los opcionales saltaba a la confirmación.
    const { responder } = guia();
    const { flow } = crearEntorno(sinDatos, '¿Quieres contarme algo más?', { responder });

    const salida = await flow({
      estado: { perfil: { destino: 'Granada', dias: 3, intereses: ['museos'] }, preguntados: ['destino', 'dias', 'intereses', 'opcionales'] },
      mensaje: '¿qué se puede comer allí?',
    });

    expect(salida.estado.preguntados.at(-1)).toBe('opcionales');
    // Tras la respuesta de la guía va directamente la pregunta fija, sin reacción del modelo.
    expect(salida.respuesta).toMatch(/^Con dos o tres días.*\)\) ¿Quieres contarme algo más\? Por ejemplo, con quién viajas/);
  });

  it('en la confirmación, una pregunta se contesta y se vuelve a pedir confirmación', async () => {
    const { responder } = guia();
    const { flow } = crearEntorno(sinDatos, undefined, { responder });

    const salida = await flow({
      estado: { perfil: { destino: 'Granada', dias: 3, intereses: ['museos'] }, preguntados: [...todoPreguntado, 'confirmacion'] },
      mensaje: '¿hay playa?',
    });

    expect(salida.respuesta).toMatch(/^Con dos o tres días.*Esto es lo que he entendido: Granada, 3 días/);
    expect(salida.perfil).toBeNull();
  });

  it('tras una pregunta del viajero, vuelve a preguntar lo pendiente sin pegar las opciones', async () => {
    const { responder } = guia();
    const { flow } = crearEntorno(sinDatos, '¿Cuántos días te planteas?', { responder });

    const salida = await flow({ estado: enGranada, mensaje: '¿cuántos días hacen falta?' });

    expect(salida.respuesta).not.toContain('Puedo planificar');
  });

  it('una pregunta no añade intereses: el viajero pregunta, no dice lo que le gusta', async () => {
    // Caso real: «¿cuántos días hacen falta para verla bien?» y «qué se puede comer allí?» dejaban
    // monumentos y gastronomía como intereses sin habérselos preguntado.
    const { flow } = crearEntorno({ ...sinDatos, intereses: ['gastronomia'] }, undefined, { responder: guia().responder });

    const salida = await flow({ estado: enGranada, mensaje: '¿qué se puede comer allí?' });

    expect(salida.estado.perfil.intereses).toBeUndefined();
  });

  it('en la confirmación, una pregunta sí puede añadir intereses («¿podemos añadir museos?»)', async () => {
    const { flow } = crearEntorno({ ...sinDatos, intereses: ['museos'] }, undefined, { responder: guia().responder });

    const salida = await flow({
      estado: { perfil: { destino: 'Granada', dias: 3, intereses: ['monumentos'] }, preguntados: [...todoPreguntado, 'confirmacion'] },
      mensaje: '¿podemos añadir museos?',
    });

    expect(salida.estado.perfil.intereses).toEqual(['monumentos', 'museos']);
  });

  it('no consulta la guía si el mensaje no es una pregunta', async () => {
    const { responder, llamadas } = guia();
    const { flow } = crearEntorno({ ...sinDatos, dias: 3 }, undefined, { responder });

    await flow({ estado: enGranada, mensaje: '3 días' });

    expect(llamadas).toEqual([]);
  });

  it('no consulta la guía si todavía no se sabe el destino', async () => {
    const { responder, llamadas } = guia();
    const { flow } = crearEntorno(sinDatos, undefined, { responder });

    await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: '¿qué me recomiendas?' });

    expect(llamadas).toEqual([]);
  });
});

describe('entrevistaFlow con la guía del destino en el guardarraíl', () => {
  const guiaGranada = async (destino: string) => (destino === 'Granada' ? ['La Alhambra es el monumento más visitado de España.'] : []);

  it('deja nombrar lugares que aparecen en la guía del destino', async () => {
    // Caso real: «la Alhambra» hacía saltar el guardarraíl y salía el texto de reserva, más seco.
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Granada' }, 'La Alhambra te va a encantar. ¿Cuántos días vas a estar?', {
      leerGuia: guiaGranada,
    });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Granada' });

    expect(salida.respaldo).toBeNull();
    expect(salida.respuesta).toBe('La Alhambra te va a encantar. ¿Cuántos días vas a estar?');
  });

  it('sigue rechazando los lugares que no están en la guía', async () => {
    const { flow } = crearEntorno({ ...sinDatos, destino: 'Granada' }, 'La Giralda te va a encantar. ¿Cuántos días vas a estar?', {
      leerGuia: guiaGranada,
    });

    const salida = await flow({ estado: { perfil: {}, preguntados: ['destino'] }, mensaje: 'Granada' });

    expect(salida.respaldo).toBe('nombre no permitido: Giralda');
  });
});
