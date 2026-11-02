// RF-01: validación de los mensajes que redacta el modelo en la entrevista.
import { describe, expect, it } from 'vitest';
import { quitarPreguntas, quitarSaludo, validarMensaje } from './guardarrail.js';

const permitidos = ['Madrid con amigos', 'Sevilla', 'Madrid', 'Barcelona', 'Granada', 'Valencia', 'Rumbo'];

describe('validarMensaje', () => {
  it('acepta una reacción breve y una pregunta sin nombres nuevos', () => {
    expect(validarMensaje('¡Madrid con amigos, qué buen plan! ¿Cuántos días vais a estar?', permitidos)).toEqual({
      valido: true,
    });
  });

  it('rechaza un nombre propio que no estaba en el mensaje del viajero ni en el catálogo', () => {
    expect(validarMensaje('¡Hola! ¿Te apuntas a un viaje al Caribe o a Madrid?', permitidos)).toEqual({
      valido: false,
      motivo: 'nombre no permitido: Caribe',
    });
  });

  it('no confunde con nombres propios las mayúsculas de principio de frase', () => {
    expect(validarMensaje('Genial. Perfecto, ¿y cuántos días?', permitidos)).toEqual({ valido: true });
  });

  it('rechaza un vocativo con un nombre inventado al principio de frase', () => {
    expect(validarMensaje('Eduardo, un par de días es genial. ¿Qué quieres hacer?', permitidos)).toEqual({
      valido: false,
      motivo: 'nombre no permitido: Eduardo',
    });
  });

  it('acepta interjecciones habituales seguidas de coma', () => {
    expect(validarMensaje('Vale, ¿y cuántos días?', permitidos)).toEqual({ valido: true });
    expect(validarMensaje('¡Hola, encantado! Perfecto, ¿a dónde vamos?', permitidos)).toEqual({ valido: true });
  });

  it('acepta tres frases cortas, lo que pide el prompt de la entrevista', () => {
    // Caso real: con hasta tres frases, el límite de 240 caracteres descartaba mensajes correctos.
    const tres =
      'Perfecto, tres días dan para conocer bien la ciudad sin ir con prisas y disfrutando de cada rincón. ' +
      'Así podréis combinar las visitas con algún rato de descanso por la tarde, que se agradece mucho. ' +
      '¿Os apetece contarme qué tipo de cosas os gusta hacer cuando viajáis?';
    expect(tres.length).toBeGreaterThan(240);
    expect(validarMensaje(tres, permitidos)).toEqual({ valido: true });
  });

  it('rechaza mensajes largos', () => {
    const largo = `${'Qué buen viaje vas a hacer, de verdad. '.repeat(8)}¿Cuántos días?`;
    expect(validarMensaje(largo, permitidos)).toEqual({ valido: false, motivo: 'demasiado largo' });
  });

  it('rechaza un mensaje vacío', () => {
    expect(validarMensaje('  ', permitidos)).toEqual({ valido: false, motivo: 'vacío' });
  });
});

describe('quitarSaludo', () => {
  it('quita el saludo del principio fuera del inicio de la conversación', () => {
    expect(quitarSaludo('Hola, ¿te gustaría contar algo más del viaje?')).toBe('¿Te gustaría contar algo más del viaje?');
    expect(quitarSaludo('¡Hola! Cuatro días suenan genial.')).toBe('Cuatro días suenan genial.');
    expect(quitarSaludo('Hola, buenas. ¿Cuántos días vas a estar?')).toBe('¿Cuántos días vas a estar?');
  });

  it('no toca un mensaje sin saludo', () => {
    expect(quitarSaludo('¡Genial! ¿Cuántos días?')).toBe('¡Genial! ¿Cuántos días?');
  });
});

describe('quitarPreguntas', () => {
  it('deja solo las frases que no preguntan', () => {
    // Caso real: la pregunta del modelo se solapaba con la pregunta fija de los opcionales.
    expect(quitarPreguntas('Entendido, me encanta. ¿Hay algo específico que quieras incluir?')).toBe('Entendido, me encanta.');
    expect(quitarPreguntas('Vale, perfecto. ¿Hay algo más? Por ejemplo, el ritmo.')).toBe('Vale, perfecto. Por ejemplo, el ritmo.');
  });

  it('quita también las preguntas sin signo de apertura', () => {
    expect(quitarPreguntas('¡Qué bien! Te apetece algo más?')).toBe('¡Qué bien!');
  });

  it('devuelve vacío si todo son preguntas', () => {
    expect(quitarPreguntas('¿Quieres contarme algo más?')).toBe('');
  });

  it('no toca un mensaje sin preguntas', () => {
    expect(quitarPreguntas('¡Genial! Pasear por Granada es un placer.')).toBe('¡Genial! Pasear por Granada es un placer.');
  });
});
