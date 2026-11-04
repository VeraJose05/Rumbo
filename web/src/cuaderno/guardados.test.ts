// RF-12: viajes guardados en el móvil («Mis viajes»).
import { describe, expect, it } from 'vitest';
import type { Viaje } from '../viaje/ajustar';
import { perfilInicial } from '../viaje/perfil';
import { estaGuardado, guardarViaje, quitarViaje } from './guardados';

const viaje = (id: string, destino = 'Sevilla'): Viaje & { id: string } => ({
  id,
  perfil: { ...perfilInicial(destino), intereses: ['museos'] },
  itinerario: { modo: 'C1', hayInformacion: true, dias: [], fuentes: [], recuperados: [] },
  quitados: [],
});

describe('guardarViaje', () => {
  it('lo añade el primero, con la fecha', () => {
    const lista = guardarViaje(guardarViaje([], viaje('a'), '2026-11-01'), viaje('b', 'Granada'), '2026-11-03');
    expect(lista.map((g) => g.viaje.id)).toEqual(['b', 'a']);
    expect(lista[0]!.guardado).toBe('2026-11-03');
  });

  it('si ya estaba (p. ej. tras un ajuste), lo actualiza en vez de duplicarlo', () => {
    const lista = guardarViaje([], viaje('a'), '2026-11-01');
    const ajustado = { ...viaje('a'), quitados: ['Catedral'] };
    const nueva = guardarViaje(lista, ajustado, '2026-11-02');
    expect(nueva).toHaveLength(1);
    expect(nueva[0]!.viaje.quitados).toEqual(['Catedral']);
  });
});

describe('quitarViaje y estaGuardado', () => {
  it('quita por id', () => {
    const lista = guardarViaje(guardarViaje([], viaje('a'), 'x'), viaje('b'), 'y');
    expect(estaGuardado(lista, 'a')).toBe(true);
    expect(estaGuardado(quitarViaje(lista, 'a'), 'a')).toBe(false);
  });
});
