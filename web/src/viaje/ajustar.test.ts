// RF-11, RF-12: ajuste del itinerario desde la web.
import { describe, expect, it } from 'vitest';
import { peticionAjuste, textoAjustando, type Viaje } from './ajustar';
import { perfilInicial } from './perfil';

const viaje: Viaje = {
  perfil: { ...perfilInicial('Sevilla'), intereses: ['museos'] },
  itinerario: { modo: 'C1', hayInformacion: true, dias: [], fuentes: [], recuperados: [] },
  quitados: ['Catedral de Sevilla'],
};

describe('peticionAjuste', () => {
  it('manda el viaje entero con el mensaje y los lugares ya quitados (para que no vuelvan)', () => {
    expect(peticionAjuste(viaje, '  más tranquilo ')).toEqual({
      data: { perfil: viaje.perfil, itinerario: viaje.itinerario, quitados: ['Catedral de Sevilla'], mensaje: 'más tranquilo' },
    });
  });

  it('no manda un mensaje vacío', () => {
    expect(() => peticionAjuste(viaje, '   ')).toThrow();
  });
});

describe('textoAjustando', () => {
  it('al quitar un lugar dice cuál', () => {
    expect(textoAjustando('quita Catedral de Granada')).toBe('Quitando Catedral de Granada');
    expect(textoAjustando('  Quita la Alhambra ')).toBe('Quitando la Alhambra');
  });

  it('con cualquier otro mensaje, lo repite entre comillas', () => {
    expect(textoAjustando('Más tranquilo')).toBe('«Más tranquilo»');
  });

  it('recorta los mensajes largos', () => {
    expect(textoAjustando('a'.repeat(80))).toBe(`«${'a'.repeat(40)}…»`);
  });
});
