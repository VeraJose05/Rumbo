// RF-01, RF-12: perfil del viajero construido paso a paso en la web (sin chat).
import { describe, expect, it } from 'vitest';
import {
  COMPANIAS, DIAS_MAX, DIAS_MIN, INTERESES, PRESUPUESTOS, RITMOS,
  cambiarDias, decidirInteres, elegir, etiquetaDias, perfilInicial, type Perfil,
} from './perfil';

describe('perfilInicial', () => {
  it('empieza con 3 días y los valores por defecto del planificador', () => {
    expect(perfilInicial()).toEqual({
      destino: null,
      dias: 3,
      intereses: [],
      ritmo: 'normal',
      presupuesto: 'medio',
      compania: 'solo',
    });
  });

  it('acepta el destino que venía de la portada si es uno con guía', () => {
    expect(perfilInicial('Granada').destino).toBe('Granada');
    expect(perfilInicial('granada').destino).toBe('Granada');
  });

  it('ignora un destino sin guía', () => {
    expect(perfilInicial('Bilbao').destino).toBeNull();
  });
});

describe('cambiarDias', () => {
  it('suma y resta días', () => {
    expect(cambiarDias(perfilInicial(), +1).dias).toBe(4);
    expect(cambiarDias(perfilInicial(), -1).dias).toBe(2);
  });

  it('no pasa de los límites del planificador (1 a 7)', () => {
    expect(DIAS_MIN).toBe(1);
    expect(DIAS_MAX).toBe(7);
    expect(cambiarDias({ ...perfilInicial(), dias: 7 }, +1).dias).toBe(7);
    expect(cambiarDias({ ...perfilInicial(), dias: 1 }, -1).dias).toBe(1);
  });

  it('no modifica el perfil original', () => {
    const perfil = perfilInicial();
    cambiarDias(perfil, +1);
    expect(perfil.dias).toBe(3);
  });
});

describe('etiquetaDias', () => {
  it('pone nombre al tipo de viaje según los días', () => {
    expect(etiquetaDias(1)).toBe('Escapada de un día');
    expect(etiquetaDias(2)).toBe('Fin de semana');
    expect(etiquetaDias(3)).toBe('Escapada larga');
    expect(etiquetaDias(5)).toBe('Viaje con calma');
    expect(etiquetaDias(7)).toBe('Una semana entera');
  });
});

describe('INTERESES', () => {
  it('son los 8 del planificador, en su orden y con nombre y descripción', () => {
    expect(INTERESES.map((i) => i.id)).toEqual([
      'monumentos', 'museos', 'gastronomia', 'naturaleza', 'ocio-nocturno', 'compras', 'playa', 'ninos',
    ]);
    for (const i of INTERESES) {
      expect(i.nombre).toBeTruthy();
      expect(i.descripcion).toBeTruthy();
      // Foto de Wikimedia Commons con el crédito que exige su licencia.
      expect(i.foto).toBe(`/fotos/gustos/${i.id}.webp`);
      expect(i.credito.autor).toBeTruthy();
      expect(i.credito.licencia).toMatch(/^CC/);
    }
  });
});

describe('decidirInteres', () => {
  it('«me va» lo añade una sola vez', () => {
    const una = decidirInteres(perfilInicial(), 'museos', true);
    expect(decidirInteres(una, 'museos', true).intereses).toEqual(['museos']);
  });

  it('«paso» lo quita si estaba', () => {
    const perfil: Perfil = { ...perfilInicial(), intereses: ['museos', 'playa'] };
    expect(decidirInteres(perfil, 'museos', false).intereses).toEqual(['playa']);
  });

  it('mantiene el orden del planificador aunque se elijan desordenados', () => {
    let perfil = decidirInteres(perfilInicial(), 'playa', true);
    perfil = decidirInteres(perfil, 'monumentos', true);
    expect(perfil.intereses).toEqual(['monumentos', 'playa']);
  });

  it('ignora un interés que no existe', () => {
    expect(decidirInteres(perfilInicial(), 'surf', true).intereses).toEqual([]);
  });
});

describe('opciones de estilo', () => {
  it('son las del planificador', () => {
    expect(RITMOS.map((r) => r.id)).toEqual(['tranquilo', 'normal', 'intenso']);
    expect(PRESUPUESTOS.map((p) => p.id)).toEqual(['bajo', 'medio', 'alto']);
    expect(COMPANIAS.map((c) => c.id)).toEqual(['solo', 'pareja', 'familia', 'amigos']);
  });

  it('el ritmo dice cuántos planes hay al día, como el planificador (2, 3 y 4)', () => {
    expect(RITMOS.map((r) => r.planes)).toEqual([2, 3, 4]);
  });
});

describe('elegir', () => {
  it('cambia ritmo, presupuesto o compañía', () => {
    const perfil = elegir(elegir(perfilInicial(), 'ritmo', 'intenso'), 'compania', 'familia');
    expect(perfil.ritmo).toBe('intenso');
    expect(perfil.compania).toBe('familia');
  });

  it('ignora valores o campos que no existen', () => {
    expect(elegir(perfilInicial(), 'ritmo', 'frenético').ritmo).toBe('normal');
    expect(elegir(perfilInicial(), 'destino', 'Bilbao').destino).toBeNull();
  });
});
