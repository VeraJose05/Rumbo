// RF-11: interpretación en código de las peticiones de cambio del itinerario.
import { describe, expect, it } from 'vitest';
import { diasAfectados, interpretarAjuste } from './ajuste-logica.js';
import { PerfilSchema } from './perfil.js';
import type { Dia } from './itinerario.js';

const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 3, intereses: ['monumentos', 'museos'], ritmo: 'normal' });
const lugares = ['Catedral de Sevilla', 'Museo de Bellas Artes', 'Barrio de Santa Cruz', 'Reales Alcázares'];

describe('interpretarAjuste', () => {
  it('«más tranquilo» baja un nivel el ritmo y «más intenso» lo sube', () => {
    expect(interpretarAjuste('hazlo más tranquilo', perfil, lugares)).toEqual([{ tipo: 'ritmo', ritmo: 'tranquilo' }]);
    expect(interpretarAjuste('quiero menos cosas cada día', perfil, lugares)).toEqual([{ tipo: 'ritmo', ritmo: 'tranquilo' }]);
    expect(interpretarAjuste('más intenso', perfil, lugares)).toEqual([{ tipo: 'ritmo', ritmo: 'intenso' }]);
    expect(interpretarAjuste('menos intenso', { ...perfil, ritmo: 'intenso' }, lugares)).toEqual([{ tipo: 'ritmo', ritmo: 'normal' }]);
  });

  it('no cambia nada si ya está en ese ritmo', () => {
    expect(interpretarAjuste('más tranquilo', { ...perfil, ritmo: 'tranquilo' }, lugares)).toEqual([]);
  });

  it('quita los lugares del itinerario que se nombran', () => {
    expect(interpretarAjuste('quita la Catedral', perfil, lugares)).toEqual([{ tipo: 'quitar-lugares', lugares: ['Catedral de Sevilla'] }]);
    expect(interpretarAjuste('no quiero ir al Alcázar ni a Santa Cruz', perfil, lugares)).toEqual([
      { tipo: 'quitar-lugares', lugares: ['Barrio de Santa Cruz', 'Reales Alcázares'] },
    ]);
  });

  it('quita o añade intereses', () => {
    expect(interpretarAjuste('quita museos', perfil, lugares)).toEqual([{ tipo: 'quitar-intereses', intereses: ['museos'] }]);
    expect(interpretarAjuste('añade tapas', perfil, lugares)).toEqual([{ tipo: 'anadir-intereses', intereses: ['gastronomia'] }]);
    expect(interpretarAjuste('también quiero playa', perfil, lugares)).toEqual([{ tipo: 'anadir-intereses', intereses: ['playa'] }]);
  });

  it('no quita un interés que no tiene ni añade uno que ya tiene', () => {
    expect(interpretarAjuste('quita las compras', perfil, lugares)).toEqual([]);
    expect(interpretarAjuste('añade museos', perfil, lugares)).toEqual([]);
  });

  it('cambia los días', () => {
    expect(interpretarAjuste('mejor 2 días', perfil, lugares)).toEqual([{ tipo: 'dias', dias: 2 }]);
    expect(interpretarAjuste('un día más', perfil, lugares)).toEqual([{ tipo: 'dias', dias: 4 }]);
    expect(interpretarAjuste('un día menos', perfil, lugares)).toEqual([{ tipo: 'dias', dias: 2 }]);
    expect(interpretarAjuste('mejor 9 días', perfil, lugares)).toEqual([{ tipo: 'dias', dias: 7 }]);
  });

  it('combina varios cambios', () => {
    expect(interpretarAjuste('más tranquilo y quita museos', perfil, lugares)).toEqual([
      { tipo: 'ritmo', ritmo: 'tranquilo' },
      { tipo: 'quitar-intereses', intereses: ['museos'] },
    ]);
  });

  it('si no entiende nada, devuelve una lista vacía', () => {
    expect(interpretarAjuste('me encanta, gracias', perfil, lugares)).toEqual([]);
  });
});

const actividad = (lugar: string, descripcion = 'Visita.') => ({ lugar, descripcion, citas: [] });
const dias: Dia[] = [
  { dia: 1, manana: [actividad('Catedral de Sevilla')], tarde: [actividad('Museo de Bellas Artes')], noche: [] },
  { dia: 2, manana: [actividad('Barrio de Santa Cruz')], tarde: [], noche: [] },
  { dia: 3, manana: [actividad('Reales Alcázares', 'Palacio con un museo de carruajes.')], tarde: [], noche: [] },
];

describe('diasAfectados', () => {
  it('el ritmo y añadir intereses afectan a todos los días', () => {
    expect(diasAfectados([{ tipo: 'ritmo', ritmo: 'tranquilo' }], dias)).toEqual([1, 2, 3]);
    expect(diasAfectados([{ tipo: 'anadir-intereses', intereses: ['playa'] }], dias)).toEqual([1, 2, 3]);
  });

  it('quitar un lugar afecta solo a los días donde está', () => {
    expect(diasAfectados([{ tipo: 'quitar-lugares', lugares: ['Barrio de Santa Cruz'] }], dias)).toEqual([2]);
  });

  it('quitar un interés afecta a los días con actividades que hablan de él', () => {
    expect(diasAfectados([{ tipo: 'quitar-intereses', intereses: ['museos'] }], dias)).toEqual([1, 3]);
  });

  it('cambiar los días no rehace ninguno: se quitan o se añaden al final', () => {
    expect(diasAfectados([{ tipo: 'dias', dias: 2 }], dias)).toEqual([]);
  });
});
