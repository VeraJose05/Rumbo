// RF-02: perfil estructurado del viajero validado con Zod.
import { describe, expect, it } from 'vitest';
import { camposPendientes, PerfilSchema } from './perfil.js';

const minimo = { destino: 'Sevilla', dias: 2, intereses: ['monumentos'] };

describe('PerfilSchema', () => {
  it('completa ritmo, presupuesto y compañía con sus valores por defecto', () => {
    expect(PerfilSchema.parse(minimo)).toEqual({
      ...minimo,
      ritmo: 'normal',
      presupuesto: 'medio',
      compania: 'solo',
    });
  });

  it('acepta un perfil completo', () => {
    const perfil = {
      destino: 'Sevilla',
      dias: 3,
      intereses: ['naturaleza', 'ninos'],
      ritmo: 'tranquilo',
      presupuesto: 'bajo',
      compania: 'familia',
    };
    expect(PerfilSchema.parse(perfil)).toEqual(perfil);
  });

  it('acepta destinos fuera del corpus, porque el sistema debe saber responder a ellos', () => {
    expect(PerfilSchema.parse({ ...minimo, destino: 'Reikiavik' }).destino).toBe('Reikiavik');
  });

  it('quita espacios del destino y rechaza un destino vacío', () => {
    expect(PerfilSchema.parse({ ...minimo, destino: '  Sevilla ' }).destino).toBe('Sevilla');
    expect(() => PerfilSchema.parse({ ...minimo, destino: '  ' })).toThrow();
  });

  it('exige entre 1 y 7 días enteros', () => {
    expect(() => PerfilSchema.parse({ ...minimo, dias: 0 })).toThrow();
    expect(() => PerfilSchema.parse({ ...minimo, dias: 8 })).toThrow();
    expect(() => PerfilSchema.parse({ ...minimo, dias: 1.5 })).toThrow();
  });

  it('exige al menos un interés de la lista y quita los repetidos', () => {
    expect(() => PerfilSchema.parse({ ...minimo, intereses: [] })).toThrow();
    expect(() => PerfilSchema.parse({ ...minimo, intereses: ['flamenco'] })).toThrow();
    expect(PerfilSchema.parse({ ...minimo, intereses: ['museos', 'museos'] }).intereses).toEqual(['museos']);
  });

  it('rechaza valores fuera de las listas de ritmo, presupuesto y compañía', () => {
    expect(() => PerfilSchema.parse({ ...minimo, ritmo: 'relajadito' })).toThrow();
    expect(() => PerfilSchema.parse({ ...minimo, presupuesto: 'ilimitado' })).toThrow();
    expect(() => PerfilSchema.parse({ ...minimo, compania: 'mascota' })).toThrow();
  });
});

describe('camposPendientes', () => {
  it('lista los campos obligatorios que faltan, en el orden en que se preguntan', () => {
    expect(camposPendientes({})).toEqual(['destino', 'dias', 'intereses']);
    expect(camposPendientes({ destino: 'Sevilla' })).toEqual(['dias', 'intereses']);
  });

  it('considera pendiente un campo con un valor inválido', () => {
    expect(camposPendientes({ destino: 'Sevilla', dias: 12, intereses: [] })).toEqual(['dias', 'intereses']);
  });

  it('no devuelve nada si el perfil ya es válido', () => {
    expect(camposPendientes(minimo)).toEqual([]);
  });
});
