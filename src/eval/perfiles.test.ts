// F5 (RNF-03): conjunto fijo de perfiles de prueba para comparar las configuraciones.
import { describe, expect, it } from 'vitest';
import { buscarDestino, DESTINOS } from '../config/destinos.js';
import { PerfilSchema } from '../flows/perfil.js';
import { PERFILES_PRUEBA } from './perfiles.js';

const delGrupo = (grupo: string) => PERFILES_PRUEBA.filter((p) => p.grupo === grupo);

describe('perfiles de prueba', () => {
  it('hay 25 perfiles con el reparto acordado', () => {
    expect(PERFILES_PRUEBA).toHaveLength(25);
    expect(delGrupo('normal')).toHaveLength(15);
    expect(delGrupo('poco-cubierto')).toHaveLength(4);
    expect(delGrupo('contradictorio')).toHaveLength(3);
    expect(delGrupo('fuera-corpus')).toHaveLength(3);
  });

  it('los identificadores no se repiten', () => {
    const ids = PERFILES_PRUEBA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los perfiles validan contra el esquema', () => {
    for (const { id, perfil } of PERFILES_PRUEBA) {
      expect(PerfilSchema.safeParse(perfil).success, id).toBe(true);
    }
  });

  it('los normales cubren cada destino del corpus tres veces', () => {
    for (const { nombre } of DESTINOS) {
      expect(delGrupo('normal').filter((p) => p.perfil.destino === nombre), nombre).toHaveLength(3);
    }
  });

  it('los de fuera del corpus no tienen guía; el resto sí', () => {
    for (const { id, grupo, perfil } of PERFILES_PRUEBA) {
      expect(buscarDestino(perfil.destino) === undefined, id).toBe(grupo === 'fuera-corpus');
    }
  });

  it('los normales varían días, ritmo y compañía', () => {
    const normales = delGrupo('normal').map((p) => PerfilSchema.parse(p.perfil));
    expect(new Set(normales.map((p) => p.dias)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(normales.map((p) => p.ritmo)).size).toBe(3);
    expect(new Set(normales.map((p) => p.compania)).size).toBe(4);
  });
});
