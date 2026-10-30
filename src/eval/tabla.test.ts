// F5: tabla de resultados por modo y grupo a partir de las ejecuciones y los juicios guardados.
import { describe, expect, it } from 'vitest';
import { agregar, tablaMarkdown } from './tabla.js';

const metricas = (fidelidad: number | null, fidelidadLaxa: number | null, coberturaCitas: number | null, ritmoCumplido: number | null, planificado = true) => ({
  planificado,
  actividades: planificado ? 4 : 0,
  fidelidad,
  fidelidadLaxa,
  coberturaCitas,
  ritmoCumplido,
});

const registros = [
  { perfilId: 'a', grupo: 'normal', modo: 'C0', segundos: 10, modelos: { llm: 'q' }, metricas: metricas(0.5, 0.75, null, 1) },
  { perfilId: 'b', grupo: 'normal', modo: 'C0', segundos: 20, modelos: { llm: 'q' }, metricas: metricas(0, 0.25, null, 0.5) },
  { perfilId: 'a', grupo: 'normal', modo: 'C1', segundos: 30, modelos: { llm: 'q' }, metricas: metricas(1, 1, 0.5, 1) },
  { perfilId: 'x', grupo: 'fuera-corpus', modo: 'C1', segundos: 0, modelos: { llm: 'q' }, metricas: metricas(null, null, null, null, false) },
];

const juicios = [
  { perfilId: 'a', modo: 'C0', llm: 'q', juez: 'g', metrica: 'relevancia', nota: 4 },
  { perfilId: 'b', modo: 'C0', llm: 'q', juez: 'g', metrica: 'relevancia', nota: 2 },
  { perfilId: 'a', modo: 'C0', llm: 'q', juez: 'g', metrica: 'viabilidad', nota: 5 },
  // De otro juez: no se mezcla.
  { perfilId: 'a', modo: 'C1', llm: 'q', juez: 'otro', metrica: 'relevancia', nota: 1 },
];

describe('agregar', () => {
  it('calcula las medias por modo y grupo, ignorando lo que no aplica', () => {
    const filas = agregar(registros, juicios, 'g');

    expect(filas.find((f) => f.modo === 'C0' && f.grupo === 'normal')).toEqual({
      modo: 'C0',
      grupo: 'normal',
      perfiles: 2,
      planificados: 2,
      fidelidad: 0.25,
      fidelidadLaxa: 0.5,
      coberturaCitas: null,
      ritmoCumplido: 0.75,
      relevancia: 3,
      viabilidad: 5,
      segundos: 15,
    });
  });

  it('incluye una fila «todos» por modo y no planificados en la cuenta', () => {
    const filas = agregar(registros, juicios, 'g');
    const todosC1 = filas.find((f) => f.modo === 'C1' && f.grupo === 'todos');

    expect(todosC1).toMatchObject({ perfiles: 2, planificados: 1, fidelidad: 1, relevancia: null });
  });

  it('ordena primero «todos» y después los grupos en orden fijo', () => {
    expect(agregar(registros, juicios, 'g').map((f) => `${f.grupo} ${f.modo}`)).toEqual([
      'todos C0',
      'todos C1',
      'normal C0',
      'normal C1',
      'fuera-corpus C1',
    ]);
  });
});

describe('tablaMarkdown', () => {
  it('da la fidelidad como intervalo y marca con un guion lo que no aplica', () => {
    const tabla = tablaMarkdown(agregar(registros, juicios, 'g'));

    expect(tabla).toContain('| normal | C0 | 2/2 | 0,25–0,50 | — | 0,75 | 3,0 | 5,0 | 15 |');
    expect(tabla).toContain('| fuera-corpus | C1 | 0/1 | — | — | — | — | — | 0 |');
  });
});
