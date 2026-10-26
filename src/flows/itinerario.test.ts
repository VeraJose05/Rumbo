// RF-05: esquema del itinerario día a día y reglas deterministas sobre él.
import { describe, expect, it } from 'vitest';
import { actividadesPorDia, DiaSchema, esquemaDiaModelo, lugaresUsados } from './itinerario.js';

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
  it('con fuentes exige al menos una cita por actividad', () => {
    const esquema = esquemaDiaModelo({ conCitas: true });
    expect(() => esquema.parse({ manana: [actividad('Catedral', [])], tarde: [], noche: [] })).toThrow();
    expect(esquema.parse({ manana: [actividad('Catedral', [2])], tarde: [], noche: [] })).toBeTruthy();
  });

  it('sin fuentes (C0) no pide citas', () => {
    const esquema = esquemaDiaModelo({ conCitas: false });
    expect(esquema.parse({ manana: [{ lugar: 'Catedral', descripcion: 'Gótica' }], tarde: [], noche: [] })).toEqual({
      manana: [{ lugar: 'Catedral', descripcion: 'Gótica' }],
      tarde: [],
      noche: [],
    });
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
