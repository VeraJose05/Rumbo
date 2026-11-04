// RF-05, RF-12: llamada al planificador desde la web.
import { describe, expect, it } from 'vitest';
import { perfilInicial } from './perfil';
import { mensajeDeError, peticionPlanificar } from './planificar';

describe('peticionPlanificar', () => {
  it('envía el perfil completo con el modo C1 (RAG básico, el que la evaluación eligió para la web)', () => {
    const perfil = { ...perfilInicial('Sevilla'), intereses: ['museos' as const] };
    expect(peticionPlanificar(perfil)).toEqual({ data: { perfil, modo: 'C1' } });
  });

  it('se niega sin destino o sin gustos (el planificador lo rechazaría)', () => {
    expect(() => peticionPlanificar(perfilInicial())).toThrow();
    expect(() => peticionPlanificar(perfilInicial('Sevilla'))).toThrow();
  });
});

describe('mensajeDeError', () => {
  it('con la cuota agotada (429) usa el mensaje del servidor y lo marca como cuota', () => {
    expect(mensajeDeError(429, { status: 'RESOURCE_EXHAUSTED', message: 'Rumbo ha agotado por ahora la cuota.' })).toEqual({
      cuota: true,
      mensaje: 'Rumbo ha agotado por ahora la cuota.',
    });
  });

  it('con otros errores da un mensaje genérico con el código', () => {
    expect(mensajeDeError(500, {})).toEqual({ cuota: false, mensaje: 'El planificador ha fallado (error 500).' });
  });
});
