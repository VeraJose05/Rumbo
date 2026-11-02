// RF-01: viajero simulado y métricas de la evaluación de la entrevista.
import { describe, expect, it } from 'vitest';
import { compararPerfil, crearViajero, resumir, type Persona, type RegistroConversacion } from './entrevista-sim.js';

const persona: Persona = {
  id: 'prueba',
  grupo: 'poco-a-poco',
  primero: 'hola',
  respuestas: { destino: ['Bilbao', 'pues Madrid'], dias: ['3'], intereses: ['museos'] },
  preguntas: { dias: '¿cuántos días recomiendas?' },
  esperado: { destino: 'Madrid', dias: 3, intereses: ['museos'] },
};

describe('crearViajero', () => {
  it('empieza con su primer mensaje', () => {
    expect(crearViajero(persona).responder('destino').texto).toBe('hola');
  });

  it('contesta a cada pregunta en orden y repite la última respuesta si se la vuelven a hacer', () => {
    const viajero = crearViajero({ ...persona, preguntas: {} });
    viajero.responder('destino');
    expect(viajero.responder('destino').texto).toBe('Bilbao');
    expect(viajero.responder('destino').texto).toBe('pues Madrid');
    expect(viajero.responder('destino').texto).toBe('pues Madrid');
    expect(viajero.responder('intereses').texto).toBe('museos');
  });

  it('hace su pregunta una sola vez antes de contestar, y lo indica', () => {
    const viajero = crearViajero(persona);
    viajero.responder('destino');
    expect(viajero.responder('dias')).toEqual({ texto: '¿cuántos días recomiendas?', esPregunta: true, respondeA: null });
    expect(viajero.responder('dias')).toEqual({ texto: '3', esPregunta: false, respondeA: 'dias' });
  });

  it('indica a qué campo responde: el primer mensaje y el «no sé» no responden a nada', () => {
    // Para contar como repetida una pregunta solo si el viajero ya la había contestado.
    const viajero = crearViajero({ ...persona, preguntas: {} });
    expect(viajero.responder('destino').respondeA).toBeNull();
    expect(viajero.responder('destino').respondeA).toBe('destino');
    expect(viajero.responder('ritmo').respondeA).toBeNull();
  });

  it('sin respuesta prevista dice «nada más» a los opcionales y «no sé» al resto', () => {
    const viajero = crearViajero(persona);
    viajero.responder('destino');
    expect(viajero.responder('opcionales').texto).toBe('nada más');
    expect(viajero.responder('ritmo').texto).toBe('no sé');
  });
});

describe('compararPerfil', () => {
  it('da por correcto el perfil igual al esperado, con los valores por defecto aplicados a los dos', () => {
    expect(compararPerfil({ destino: 'Madrid', dias: 3, intereses: ['museos'], ritmo: 'normal' }, persona)).toEqual({ correcto: true, errores: [] });
  });

  it('no tiene en cuenta el orden de los intereses', () => {
    const esperado = { ...persona, esperado: { ...persona.esperado, intereses: ['museos', 'monumentos'] } } as Persona;
    expect(compararPerfil({ destino: 'Madrid', dias: 3, intereses: ['monumentos', 'museos'] }, esperado).correcto).toBe(true);
  });

  it('admite los intereses tolerados, estén o no', () => {
    const tolerante = { ...persona, toleraIntereses: ['ninos'] } as Persona;
    expect(compararPerfil({ destino: 'Madrid', dias: 3, intereses: ['museos', 'ninos'] }, tolerante).correcto).toBe(true);
    expect(compararPerfil({ destino: 'Madrid', dias: 3, intereses: ['museos'] }, tolerante).correcto).toBe(true);
  });

  it('lista los campos que no coinciden, también los inventados', () => {
    const resultado = compararPerfil({ destino: 'Madrid', dias: 2, intereses: ['museos', 'gastronomia'], compania: 'pareja' }, persona);
    expect(resultado.correcto).toBe(false);
    expect(resultado.errores).toEqual([
      { campo: 'dias', esperado: 3, obtenido: 2 },
      { campo: 'intereses', esperado: ['museos'], obtenido: ['gastronomia', 'museos'] },
      { campo: 'compania', esperado: 'solo', obtenido: 'pareja' },
    ]);
  });
});

const registro = (extra: Partial<RegistroConversacion>): RegistroConversacion => ({
  id: 'x',
  grupo: 'poco-a-poco',
  llegaAConfirmar: true,
  correcto: true,
  errores: [],
  turnos: 4,
  repetidas: 0,
  reservas: 0,
  contestadasConGuia: 0,
  preguntasDelViajero: 0,
  segundos: 8,
  conversacion: [],
  ...extra,
});

describe('resumir', () => {
  it('cuenta conversaciones correctas, errores por campo, repetidas, reservas y tiempos', () => {
    const resumen = resumir([
      registro({}),
      registro({ correcto: false, errores: [{ campo: 'compania', esperado: 'solo', obtenido: 'pareja' }], turnos: 6, reservas: 1, segundos: 12 }),
      registro({ llegaAConfirmar: false, correcto: false, turnos: 15, repetidas: 3, segundos: 40 }),
      registro({ preguntasDelViajero: 2, contestadasConGuia: 1 }),
    ]);
    expect(resumen).toEqual({
      conversaciones: 4,
      llegan: 3,
      correctas: 2,
      erroresPorCampo: { compania: 1 },
      turnosMedios: 7.25,
      repetidas: 3,
      reservas: 1,
      turnosTotales: 29,
      preguntasDelViajero: 2,
      contestadasConGuia: 1,
      segundosPorTurno: 68 / 29,
    });
  });
});
