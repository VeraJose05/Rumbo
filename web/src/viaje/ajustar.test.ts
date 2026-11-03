// RF-11, RF-12: ajuste del itinerario desde la web.
import { describe, expect, it } from 'vitest';
import { peticionAjuste, type Viaje } from './ajustar';
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
