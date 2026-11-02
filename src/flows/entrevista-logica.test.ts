// RF-01: lógica determinista de la entrevista (qué guardar, qué preguntar y cuándo terminar).
import { describe, expect, it } from 'vitest';
import {
  avisoDestino,
  descartarSinRespaldo,
  diasDelMensaje,
  respaldarIntereses,
  respaldarQuitar,
  esAfirmacion,
  esPregunta,
  fusionarPerfil,
  opcionalesPendientes,
  resumirPerfil,
  siguientePaso,
} from './entrevista-logica.js';
import { PerfilSchema } from './perfil.js';

const sinDatos = { destino: null, dias: null, intereses: [], ritmo: null, presupuesto: null, compania: null };

describe('fusionarPerfil', () => {
  it('añade los datos nuevos y conserva los que ya había', () => {
    expect(fusionarPerfil({ destino: 'Sevilla' }, { ...sinDatos, dias: 3, compania: 'familia' })).toEqual({
      destino: 'Sevilla',
      dias: 3,
      compania: 'familia',
    });
  });

  it('un dato nuevo sustituye al anterior, pero un null no borra nada', () => {
    expect(fusionarPerfil({ destino: 'Sevilla', dias: 2 }, { ...sinDatos, dias: 4 })).toEqual({
      destino: 'Sevilla',
      dias: 4,
    });
  });

  it('acumula los intereses sin repetir', () => {
    expect(
      fusionarPerfil({ intereses: ['museos'] }, { ...sinDatos, intereses: ['naturaleza', 'museos'] }).intereses,
    ).toEqual(['museos', 'naturaleza']);
  });

  it('escribe el destino como en el catálogo', () => {
    expect(fusionarPerfil({}, { ...sinDatos, destino: 'granada' }).destino).toBe('Granada');
  });

  it('no guarda un destino sin guía, para que se vuelva a preguntar', () => {
    expect(fusionarPerfil({}, { ...sinDatos, destino: 'Japón', dias: 5 })).toEqual({ dias: 5 });
    expect(fusionarPerfil({ destino: 'Sevilla' }, { ...sinDatos, destino: 'Japón' }).destino).toBe('Sevilla');
  });

  it('quita los intereses que el viajero pide quitar', () => {
    const perfil = { intereses: ['gastronomia', 'ocio-nocturno', 'monumentos'] };
    expect(fusionarPerfil(perfil, { ...sinDatos, interesesQuitar: ['ocio-nocturno'] }).intereses).toEqual([
      'gastronomia',
      'monumentos',
    ]);
  });

  it('si se quitan todos los intereses, el campo queda pendiente', () => {
    const resultado = fusionarPerfil({ destino: 'Sevilla', dias: 2, intereses: ['museos'] }, { ...sinDatos, interesesQuitar: ['museos'] });
    expect(resultado.intereses).toBeUndefined();
  });

  it('descarta los valores inválidos para que se vuelvan a preguntar', () => {
    expect(fusionarPerfil({}, { ...sinDatos, destino: 'Sevilla', dias: 15 })).toEqual({ destino: 'Sevilla' });
  });
});

describe('siguientePaso', () => {
  it('pregunta el primer campo obligatorio que falta', () => {
    expect(siguientePaso({ perfil: {}, preguntados: [] })).toEqual({ tipo: 'preguntar', campo: 'destino' });
    expect(siguientePaso({ perfil: { destino: 'Sevilla', dias: 2 }, preguntados: ['destino', 'dias'] })).toEqual({
      tipo: 'preguntar',
      campo: 'intereses',
    });
  });

  it('pregunta por los intereses aunque ya se haya deducido alguno', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['ninos'] };
    expect(siguientePaso({ perfil, preguntados: ['destino'] })).toEqual({ tipo: 'preguntar', campo: 'intereses' });
  });

  it('con lo obligatorio completo y los intereses preguntados, pregunta una vez por los opcionales', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['museos'] };
    expect(siguientePaso({ perfil, preguntados: ['intereses'] })).toEqual({ tipo: 'preguntar', campo: 'opcionales' });
  });

  it('después pide confirmar el perfil validado, con los valores por defecto', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['museos'], ritmo: 'tranquilo' };
    expect(siguientePaso({ perfil, preguntados: ['intereses', 'opcionales'] })).toEqual({
      tipo: 'confirmar',
      perfil: { ...perfil, presupuesto: 'medio', compania: 'solo' },
    });
  });

  it('termina cuando el viajero ha confirmado', () => {
    const perfil = { destino: 'Sevilla', dias: 2, intereses: ['museos'] };
    expect(siguientePaso({ perfil, preguntados: ['intereses', 'opcionales', 'confirmado'] })).toEqual({
      tipo: 'terminar',
      perfil: { ...perfil, ritmo: 'normal', presupuesto: 'medio', compania: 'solo' },
    });
  });

  it('no vuelve a preguntar los intereses si el viajero ya dijo alguno además de «niños»', () => {
    const perfil = { destino: 'Sevilla', dias: 4, intereses: ['monumentos', 'gastronomia'] };
    expect(siguientePaso({ perfil, preguntados: ['destino'] })).toEqual({ tipo: 'preguntar', campo: 'opcionales' });
  });

  it('si ya sabe compañía, ritmo y presupuesto, no pregunta los opcionales y pasa a confirmar', () => {
    // Todo dicho de golpe en el primer mensaje.
    const perfil = { destino: 'Sevilla', dias: 4, intereses: ['monumentos'], ritmo: 'tranquilo', presupuesto: 'bajo', compania: 'familia' };
    expect(siguientePaso({ perfil, preguntados: ['destino'] })).toEqual({ tipo: 'confirmar', perfil });
  });

  it('si al corregir falta un dato obligatorio, vuelve a preguntarlo antes de confirmar', () => {
    const perfil = { destino: 'Sevilla', dias: 2 };
    expect(siguientePaso({ perfil, preguntados: ['intereses', 'opcionales'] })).toEqual({
      tipo: 'preguntar',
      campo: 'intereses',
    });
  });
});

describe('avisoDestino', () => {
  it('si el destino no tiene guía, lo dice y pregunta por uno de los disponibles', () => {
    expect(avisoDestino('Bilbao')).toBe(
      'Lo siento, todavía no tengo información de Bilbao. Puedo ayudarte con Sevilla, Madrid, Barcelona, Granada y Valencia. ¿A cuál te gustaría ir?',
    );
  });

  it('no avisa si el destino está en el catálogo', () => {
    expect(avisoDestino('Granada')).toBeNull();
  });
});

describe('resumirPerfil', () => {
  it('describe el perfil en una frase legible', () => {
    const perfil = PerfilSchema.parse({
      destino: 'Sevilla',
      dias: 3,
      intereses: ['naturaleza', 'ninos'],
      ritmo: 'tranquilo',
      presupuesto: 'bajo',
      compania: 'familia',
    });

    expect(resumirPerfil(perfil)).toBe(
      'Sevilla, 3 días, en familia, ritmo tranquilo, presupuesto bajo. Intereses: naturaleza, niños.',
    );
  });

  it('usa singular para un día', () => {
    const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 1, intereses: ['museos'] });

    expect(resumirPerfil(perfil)).toBe('Sevilla, 1 día, viajando solo, ritmo normal, presupuesto medio. Intereses: museos.');
  });
});

describe('esAfirmacion', () => {
  it('reconoce respuestas cortas de acuerdo', () => {
    for (const mensaje of ['sí', 'Si', 'vale', 'Perfecto!', 'correcto', 'ok', 'de acuerdo', 'sí, perfecto', 'genial, adelante']) {
      expect(esAfirmacion(mensaje)).toBe(true);
    }
  });

  it('no confunde con un sí las correcciones o las negativas', () => {
    for (const mensaje of ['no', 'sí, pero mejor 2 días', 'perfecto, añade gastronomía', 'vale pero quita museos', 'casi']) {
      expect(esAfirmacion(mensaje)).toBe(false);
    }
  });

  it('reconoce que no quiere cambiar nada', () => {
    // Caso real: «no» a «¿Es correcto, o quieres cambiar algo?» quería decir «no cambies nada».
    for (const mensaje of ['nada', 'no quiero cambiar nada', 'no, está bien así', 'todo bien, gracias', 'así está bien', 'no, nada más']) {
      expect(esAfirmacion(mensaje), mensaje).toBe(true);
    }
  });

  it('no toma por conformidad un «no» solo ni un «no está bien»', () => {
    for (const mensaje of ['no', 'no está bien', 'no, no está bien', 'no, quita los monumentos', 'nada de museos']) {
      expect(esAfirmacion(mensaje), mensaje).toBe(false);
    }
  });
});

describe('respaldarQuitar', () => {
  it('solo quita los intereses que el mensaje nombra', () => {
    // Caso real: un simple «no» en la confirmación quitaba los monumentos.
    expect(respaldarQuitar(['monumentos'], 'no')).toEqual([]);
    expect(respaldarQuitar(['museos', 'monumentos'], 'quita los museos')).toEqual(['museos']);
    expect(respaldarQuitar(['ocio-nocturno'], 'sin salir de noche')).toEqual(['ocio-nocturno']);
    expect(respaldarQuitar(['gastronomia'], 'quita lo de comer')).toEqual(['gastronomia']);
  });
});

describe('opcionalesPendientes', () => {
  it('ofrece solo los datos opcionales que faltan, en el orden de la pregunta', () => {
    expect(opcionalesPendientes({ compania: 'familia' })).toEqual(['ritmo', 'presupuesto']);
    expect(opcionalesPendientes({})).toEqual(['compania', 'ritmo', 'presupuesto']);
    expect(opcionalesPendientes({ compania: 'solo', ritmo: 'normal', presupuesto: 'alto' })).toEqual([]);
  });

  it('no cuenta como sabido un valor que no es válido', () => {
    expect(opcionalesPendientes({ ritmo: 'rapidísimo' })).toEqual(['compania', 'ritmo', 'presupuesto']);
  });
});

// El extractor (3B) rellenaba ritmo «normal» y presupuesto «medio» aunque el viajero no dijera nada.
describe('descartarSinRespaldo', () => {
  const extraido = { ...sinDatos, destino: 'Sevilla', dias: 4, compania: 'pareja', ritmo: 'normal', presupuesto: 'medio' };

  it('quita el ritmo y el presupuesto si el mensaje no habla de ellos', () => {
    const mensaje = 'quiero ir a sevilla unos 4-5 dias, con mi pareja, nos interesa la playa las tapas y los monumentos';
    expect(descartarSinRespaldo(extraido, mensaje)).toEqual({ ...extraido, ritmo: null, presupuesto: null });
  });

  it('los conserva si el mensaje habla de ellos, aunque sea de forma indirecta', () => {
    expect(descartarSinRespaldo({ ...extraido, ritmo: 'tranquilo', presupuesto: 'bajo' }, 'tranquilos y sin gastar mucho')).toMatchObject({
      ritmo: 'tranquilo',
      presupuesto: 'bajo',
    });
    expect(descartarSinRespaldo(extraido, 'Vamos en pareja, ritmo normal, presupuesto medio')).toMatchObject({ ritmo: 'normal', presupuesto: 'medio' });
    expect(descartarSinRespaldo({ ...extraido, presupuesto: 'alto' }, 'queremos darnos un lujo')).toMatchObject({ presupuesto: 'alto' });
  });

  it('acepta respuestas cortas a la pregunta («intenso», «medio»)', () => {
    expect(descartarSinRespaldo({ ...extraido, ritmo: 'intenso', presupuesto: null }, 'intenso')).toMatchObject({ ritmo: 'intenso' });
    expect(descartarSinRespaldo({ ...extraido, ritmo: null }, 'medio')).toMatchObject({ presupuesto: 'medio' });
  });

  it('no toca el destino ni los días', () => {
    expect(descartarSinRespaldo(extraido, 'playa')).toMatchObject({ destino: 'Sevilla', dias: 4 });
  });

  it('quita la compañía si el mensaje no habla de ella', () => {
    // Caso real: «Un fin de semana en Granada» salía como viaje en pareja.
    expect(descartarSinRespaldo(extraido, 'Un fin de semana en Granada')).toMatchObject({ compania: null });
  });

  it('conserva la compañía si el mensaje habla de ella', () => {
    for (const mensaje of ['con mi pareja', 'voy sola', 'con mi mujer y mis dos hijos', 'en familia', 'con unos amigos', 'mi novio y yo']) {
      expect(descartarSinRespaldo(extraido, mensaje), mensaje).toMatchObject({ compania: 'pareja' });
    }
  });
});

describe('resumirPerfil con valores por defecto', () => {
  it('marca los datos que el viajero no ha dado', () => {
    const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 4, intereses: ['playa'], compania: 'pareja' });
    expect(resumirPerfil(perfil, ['ritmo', 'presupuesto'])).toBe(
      'Sevilla, 4 días, en pareja, ritmo normal (por defecto), presupuesto medio (por defecto). Intereses: playa.',
    );
  });
});

// El extractor convirtió «la comida y la cultura» en gastronomía y naturaleza.
describe('respaldarIntereses fuera de la pregunta de intereses', () => {
  it('no deja intereses si el mensaje solo dice destino y días', () => {
    // Caso real: «Un fin de semana en Granada» dejaba gastronomía y monumentos.
    expect(respaldarIntereses(['gastronomia', 'monumentos'], 'Un fin de semana en Granada', true)).toEqual([]);
  });

  it('los deja si el mensaje habla de ellos', () => {
    expect(respaldarIntereses(['monumentos', 'gastronomia'], '4 días en Sevilla, monumentos y tapas', true)).toEqual(['monumentos', 'gastronomia']);
    expect(respaldarIntereses(['museos'], 'Madrid, que quiero ver museos', true)).toEqual(['museos']);
  });

  it('los deja si el mensaje nombra un lugar que no es el destino', () => {
    expect(respaldarIntereses(['museos'], 'quiero ver el Prado en Madrid', true)).toEqual(['museos']);
  });
});

describe('diasDelMensaje', () => {
  it('entiende «fin de semana» y «una semana» en código', () => {
    // Caso de la evaluación: «un fin de semana» salía como 7 días.
    expect(diasDelMensaje('un fin de semana')).toBe(2);
    expect(diasDelMensaje('Un finde en Granada')).toBe(2);
    expect(diasDelMensaje('una semana')).toBe(7);
  });

  it('deja el resto al extractor', () => {
    expect(diasDelMensaje('3 días')).toBeNull();
    expect(diasDelMensaje('Barcelona')).toBeNull();
  });
});

describe('respaldarIntereses: intereses nombrados', () => {
  it('añade los intereses que el mensaje nombra aunque el modelo los pierda', () => {
    // Casos de la evaluación: «salir de noche y tapas» perdía gastronomía; «playa», todo.
    expect(respaldarIntereses(['ocio-nocturno'], 'salir de noche y tapas')).toEqual(['ocio-nocturno', 'gastronomia']);
    expect(respaldarIntereses([], 'playa')).toEqual(['playa']);
    expect(respaldarIntereses(['compras'], 'compras y museos')).toEqual(['compras', 'museos']);
  });

  it('no los añade si el mensaje es una pregunta («¿hay playa?» no es un interés)', () => {
    expect(respaldarIntereses([], '¿hay playa?')).toEqual([]);
  });

  it('no añade nada si el mensaje no nombra ningún interés', () => {
    expect(respaldarIntereses([], 'Un fin de semana en Granada', true)).toEqual([]);
  });
});

describe('respaldarIntereses', () => {
  it('respondiendo a los intereses, confía en lo que el modelo deduce de los nombres', () => {
    expect(respaldarIntereses(['monumentos'], 'me encanta todo lo de Gaudí')).toEqual(['monumentos']);
  });

  it('quita los intereses de los que el mensaje no habla y traduce «cultura» a monumentos y museos', () => {
    expect(respaldarIntereses(['gastronomia', 'naturaleza'], 'quiero viajar a granada con mi familia, 4 dias y nos gusta la comida y la cultura')).toEqual([
      'gastronomia',
      'monumentos',
      'museos',
    ]);
  });

  it('conserva los intereses respaldados, aunque se digan con otras palabras', () => {
    // Con la errata «monumetos», que el modelo sí entendía.
    expect(respaldarIntereses(['monumentos', 'gastronomia'], 'quiero ver monumetos y probar las tapas andaluzas')).toEqual(['monumentos', 'gastronomia']);
    expect(respaldarIntereses(['monumentos', 'gastronomia'], 'ver la catedral y comer bien')).toEqual(['monumentos', 'gastronomia']);
    expect(respaldarIntereses(['naturaleza', 'ocio-nocturno'], 'pasear por el parque y salir de copas')).toEqual(['naturaleza', 'ocio-nocturno']);
    expect(respaldarIntereses(['ninos'], 'vamos con nuestros hijos')).toEqual(['ninos']);
  });

  it('deja al modelo los intereses que se deducen de nombres de sitios o platos', () => {
    // Una lista de palabras no puede saber que el Prado es un museo: eso sí lo sabe el modelo.
    expect(respaldarIntereses(['ocio-nocturno', 'museos'], 'queremos salir de fiesta y ver el Prado')).toEqual(['ocio-nocturno', 'museos']);
    expect(respaldarIntereses(['playa', 'gastronomia', 'ninos'], 'playa y paella con los niños')).toEqual(['playa', 'gastronomia', 'ninos']);
    expect(respaldarIntereses(['monumentos'], 'Gaudí y la Sagrada Familia')).toEqual(['monumentos']);
  });

  it('no deduce «niños» de «familia»', () => {
    expect(respaldarIntereses(['ninos', 'gastronomia'], 'con mi familia, nos gusta comer')).toEqual(['gastronomia']);
  });

  it('acepta los nombres de la lista tal cual, como respuesta a la pregunta', () => {
    expect(respaldarIntereses(['museos', 'playa'], 'museos y playa')).toEqual(['museos', 'playa']);
  });
});

describe('esPregunta', () => {
  it('reconoce preguntas con signo de interrogación', () => {
    expect(esPregunta('no sé, ¿cuántos días hacen falta para verla bien?')).toBe(true);
    expect(esPregunta('merece la pena ir en verano?')).toBe(true);
  });

  it('reconoce preguntas sin signos que empiezan por una palabra interrogativa', () => {
    expect(esPregunta('qué se puede ver en Granada')).toBe(true);
    expect(esPregunta('Cuántos días recomiendas')).toBe(true);
    expect(esPregunta('dónde se come bien')).toBe(true);
  });

  it('no toma por pregunta una respuesta normal', () => {
    expect(esPregunta('3 días')).toBe(false);
    expect(esPregunta('nos gusta mucho pasear y comer bien')).toBe(false);
    // «como» y «cuando» sin tilde no se cuentan: son también conjunciones.
    expect(esPregunta('como 3 días')).toBe(false);
    expect(esPregunta('cuando haga bueno')).toBe(false);
  });
});
