// RF-04: consultas de recuperación a partir del perfil y fusión de sus resultados.
import { describe, expect, it } from 'vitest';
import { consultasDelPerfil, fusionarResultados } from './consultas.js';
import { PerfilSchema } from './perfil.js';

describe('consultasDelPerfil', () => {
  it('crea una consulta base y una expandida por cada interés', () => {
    const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 2, intereses: ['naturaleza', 'ocio-nocturno'] });

    expect(consultasDelPerfil(perfil)).toEqual([
      { motivo: 'imprescindible', texto: 'lo imprescindible que ver y hacer, lugares más famosos' },
      { motivo: 'naturaleza', texto: 'parques, jardines, río y espacios naturales para pasear' },
      { motivo: 'ocio-nocturno', texto: 'bares, copas, vida nocturna y salir de noche' },
    ]);
  });
});

describe('fusionarResultados', () => {
  const r = (id: string) => ({ id });

  it('alterna entre consultas para que todas estén representadas, hasta el límite', () => {
    const listas = [
      [r('a1'), r('a2'), r('a3')],
      [r('b1'), r('b2')],
      [r('c1')],
    ];
    expect(fusionarResultados(listas, 5).map((x) => x.id)).toEqual(['a1', 'b1', 'c1', 'a2', 'b2']);
  });

  it('no repite un fragmento que devuelven varias consultas', () => {
    const listas = [
      [r('x'), r('a')],
      [r('x'), r('b')],
    ];
    expect(fusionarResultados(listas, 10).map((x) => x.id)).toEqual(['x', 'a', 'b']);
  });
});
