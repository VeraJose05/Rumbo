// F5 (RNF-03): métricas deterministas sobre un itinerario ya generado.
import { describe, expect, it } from 'vitest';
import type { Itinerario } from '../flows/planificacion.js';
import { PerfilSchema } from '../flows/perfil.js';
import { enCorpus, metricasItinerario } from './metricas.js';

const corpus = ['* Torre del Oro - Torre vigía junto al río.', 'El Parque de María Luisa tiene la Plaza de España.', 'Hay robles en la sierra.'];

describe('enCorpus', () => {
  it('acepta un lugar cuyas palabras están todas en un mismo fragmento', () => {
    expect(enCorpus('Torre del Oro', corpus)).toBe(true);
    expect(enCorpus('plaza de españa', corpus)).toBe(true);
  });

  it('rechaza un lugar cuyas palabras están repartidas entre fragmentos', () => {
    // «parque» está en el segundo y «robles» en el tercero: no es un lugar del corpus.
    expect(enCorpus('Parque de los Robles', corpus)).toBe(false);
  });

  it('rechaza cualquier lugar si no hay corpus (destino fuera del corpus)', () => {
    expect(enCorpus('Torre del Oro', [])).toBe(false);
  });
});

type Verificacion = 'verificada' | 'cita-erronea' | 'sin-fuente' | null;
const actividad = (lugar: string, verificacion: Verificacion = null) => ({ lugar, descripcion: '', citas: [], verificacion });

function itinerario(modo: 'C0' | 'C1', dias: Itinerario['dias'], hayInformacion = true): Itinerario {
  return { modo, hayInformacion, dias, fuentes: [], recuperados: [] };
}

// Ritmo tranquilo: 2 actividades por día.
const perfil = PerfilSchema.parse({ destino: 'Sevilla', dias: 2, intereses: ['monumentos'], ritmo: 'tranquilo' });

describe('metricasItinerario', () => {
  it('en C1 calcula fidelidad, cobertura de citas y ritmo', () => {
    const resultado = metricasItinerario(
      itinerario('C1', [
        { dia: 1, manana: [actividad('Torre del Oro', 'verificada')], tarde: [actividad('Plaza de España', 'cita-erronea')], noche: [] },
        { dia: 2, manana: [actividad('Parque de los Robles', 'sin-fuente')], tarde: [], noche: [] },
      ]),
      perfil,
      corpus,
    );

    expect(resultado).toEqual({
      planificado: true,
      actividades: 3,
      // Torre del Oro y Plaza de España están en el corpus; el parque, no.
      fidelidad: 2 / 3,
      // Solo la Torre del Oro está en el texto que cita.
      coberturaCitas: 1 / 3,
      // El día 2 tiene 1 actividad en vez de 2.
      ritmoCumplido: 1 / 2,
    });
  });

  it('en C0 la fidelidad se mide contra el corpus y la cobertura de citas no aplica', () => {
    const resultado = metricasItinerario(
      itinerario('C0', [{ dia: 1, manana: [actividad('Torre del Oro')], tarde: [actividad('Callejón de las Flores')], noche: [] }]),
      perfil,
      corpus,
    );

    expect(resultado.fidelidad).toBe(1 / 2);
    expect(resultado.coberturaCitas).toBeNull();
  });

  it('un día que falta cuenta como ritmo no cumplido', () => {
    const resultado = metricasItinerario(
      itinerario('C0', [{ dia: 1, manana: [actividad('a'), actividad('b')], tarde: [], noche: [] }]),
      perfil,
      corpus,
    );

    expect(resultado.ritmoCumplido).toBe(1 / 2);
  });

  it('si no planifica (RF-07), no hay actividades que medir', () => {
    expect(metricasItinerario(itinerario('C1', [], false), perfil, [])).toEqual({
      planificado: false,
      actividades: 0,
      fidelidad: null,
      coberturaCitas: null,
      ritmoCumplido: null,
    });
  });
});
