// RF-05: esquema del itinerario día a día y reglas deterministas sobre él.
import { describe, expect, it } from 'vitest';
import {
  actividadesPorDia,
  DiaSchema,
  esquemaDiaModelo,
  lugaresUsados,
  repartirEnFranjas,
  totalActividades,
} from './itinerario.js';

const actividad = (lugar: string, citas: number[] = [1]) => ({ lugar, descripcion: 'Algo', citas });

describe('actividadesPorDia', () => {
  it('traduce el ritmo a actividades por día', () => {
    expect(actividadesPorDia('tranquilo')).toBe(2);
    expect(actividadesPorDia('normal')).toBe(3);
    expect(actividadesPorDia('intenso')).toBe(4);
  });
});

describe('DiaSchema', () => {
  it('acepta franjas con varias actividades o vacías', () => {
    const dia = { dia: 1, manana: [actividad('Catedral'), actividad('Giralda')], tarde: [], noche: [actividad('Alameda')] };
    expect(DiaSchema.parse(dia)).toEqual(dia);
  });

  it('rechaza un día sin ninguna franja', () => {
    expect(() => DiaSchema.parse({ dia: 1, manana: [actividad('Catedral')] })).toThrow();
  });
});

describe('esquemaDiaModelo', () => {
  const act = (franja: string, citas?: number[]) => ({ franja, lugar: 'Catedral', descripcion: 'Gótica', ...(citas && { citas }) });

  it('exige exactamente el número de actividades del ritmo, cada una con su franja', () => {
    const esquema = esquemaDiaModelo({ conCitas: false, actividades: 2 });
    expect(esquema.parse({ actividades: [act('manana'), act('noche')] })).toBeTruthy();
    expect(() => esquema.parse({ actividades: [act('manana')] })).toThrow();
    expect(() => esquema.parse({ actividades: [act('manana'), act('tarde'), act('noche')] })).toThrow();
    expect(() => esquema.parse({ actividades: [act('madrugada'), act('noche')] })).toThrow();
  });

  it('con fuentes exige al menos una cita por actividad', () => {
    const esquema = esquemaDiaModelo({ conCitas: true, actividades: 1 });
    expect(() => esquema.parse({ actividades: [act('manana', [])] })).toThrow();
    expect(esquema.parse({ actividades: [act('manana', [2])] })).toBeTruthy();
  });
});

describe('repartirEnFranjas', () => {
  it('agrupa las actividades por franja y quita las repetidas o ya usadas', () => {
    const actividades = [
      { franja: 'manana' as const, lugar: 'Catedral', descripcion: 'a', citas: [1] },
      { franja: 'tarde' as const, lugar: 'Parque de María Luisa', descripcion: 'b', citas: [2] },
      { franja: 'noche' as const, lugar: 'parque de maria luisa', descripcion: 'c', citas: [2] },
      { franja: 'noche' as const, lugar: 'Triana', descripcion: 'd', citas: [3] },
    ];

    expect(repartirEnFranjas(3, actividades, ['Triana'])).toEqual({
      dia: 3,
      manana: [{ lugar: 'Catedral', descripcion: 'a', citas: [1] }],
      tarde: [{ lugar: 'Parque de María Luisa', descripcion: 'b', citas: [2] }],
      noche: [],
    });
  });

  it('no pasa del máximo indicado', () => {
    const actividades = ['A', 'B', 'C'].map((lugar) => ({ franja: 'tarde' as const, lugar, descripcion: '' }));
    expect(totalActividades(repartirEnFranjas(1, actividades, [], 2))).toBe(2);
  });

  it('sin citas (C0) deja la lista de citas vacía', () => {
    expect(repartirEnFranjas(1, [{ franja: 'manana', lugar: 'Catedral', descripcion: 'a' }], []).manana).toEqual([
      { lugar: 'Catedral', descripcion: 'a', citas: [] },
    ]);
  });
});

describe('lugaresUsados', () => {
  it('lista los lugares de todos los días sin repetir', () => {
    const dias = [
      { dia: 1, manana: [actividad('Catedral')], tarde: [actividad('Triana')], noche: [] },
      { dia: 2, manana: [actividad('Alcázar')], tarde: [], noche: [actividad('Triana')] },
    ];
    expect(lugaresUsados(dias)).toEqual(['Catedral', 'Triana', 'Alcázar']);
  });
});

describe('totalActividades', () => {
  it('suma las actividades de las tres franjas', () => {
    expect(totalActividades({ dia: 1, manana: [actividad('A'), actividad('B')], tarde: [], noche: [actividad('C')] })).toBe(3);
  });
});
