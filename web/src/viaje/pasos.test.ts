// RF-12: pasos del recorrido y qué hace falta para avanzar.
import { describe, expect, it } from 'vitest';
import { perfilInicial } from './perfil';
import { pasoPendiente, puedeSeguir } from './pasos';

const completo = { ...perfilInicial('Sevilla'), intereses: ['museos' as const] };

describe('puedeSeguir', () => {
  it('destino pide ciudad y gustos al menos uno', () => {
    expect(puedeSeguir('destino', perfilInicial())).toBe(false);
    expect(puedeSeguir('destino', perfilInicial('Sevilla'))).toBe(true);
    expect(puedeSeguir('gustos', perfilInicial('Sevilla'))).toBe(false);
    expect(puedeSeguir('gustos', completo)).toBe(true);
  });
});

describe('pasoPendiente', () => {
  it('devuelve el primer paso anterior incompleto', () => {
    expect(pasoPendiente('estilo', perfilInicial())).toBe('destino');
    expect(pasoPendiente('estilo', perfilInicial('Sevilla'))).toBe('gustos');
  });

  it('es null si todo lo anterior está completo', () => {
    expect(pasoPendiente('estilo', completo)).toBeNull();
    expect(pasoPendiente('destino', perfilInicial())).toBeNull();
  });
});
