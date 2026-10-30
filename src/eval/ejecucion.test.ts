// F5 (RNF-03): argumentos de la evaluación y qué ejecuciones quedan pendientes para poder retomar.
import { describe, expect, it } from 'vitest';
import { clave, claveDeJuicio, claveJuicio, juiciosPendientes, leerHechos, parsearArgumentos, pendientes } from './ejecucion.js';
import type { PerfilPrueba } from './perfiles.js';

describe('parsearArgumentos', () => {
  it('por defecto, todos los modos y perfiles en el fichero de resultados habitual', () => {
    expect(parsearArgumentos([])).toEqual({ modos: ['C0', 'C1', 'C2'], perfiles: null, salida: 'resultados/evaluacion.jsonl' });
  });

  it('acepta modos, perfiles y fichero de salida', () => {
    expect(parsearArgumentos(['--modos', 'C1', '--perfiles', 'sevilla-1,bilbao', '--salida', 'resultados/prueba.jsonl'])).toEqual({
      modos: ['C1'],
      perfiles: ['sevilla-1', 'bilbao'],
      salida: 'resultados/prueba.jsonl',
    });
  });

  it('rechaza un modo o una opción desconocidos', () => {
    expect(() => parsearArgumentos(['--modos', 'C9'])).toThrow();
    expect(() => parsearArgumentos(['--rapido'])).toThrow('--rapido');
  });
});

describe('leerHechos', () => {
  it('devuelve la clave de cada ejecución guardada', () => {
    const contenido = [
      JSON.stringify({ perfilId: 'sevilla-1', modo: 'C0', modelos: { llm: 'qwen2.5:3b' } }),
      JSON.stringify({ perfilId: 'sevilla-1', modo: 'C1', modelos: { llm: 'qwen2.5:3b' } }),
      '',
    ].join('\n');

    expect(leerHechos(contenido)).toEqual(new Set(['sevilla-1|C0|qwen2.5:3b', 'sevilla-1|C1|qwen2.5:3b']));
  });

  it('ignora una última línea a medias (ejecución cortada mientras escribía)', () => {
    const contenido = `${JSON.stringify({ perfilId: 'bilbao', modo: 'C0', modelos: { llm: 'm' } })}\n{"perfilId":"tol`;

    expect(leerHechos(contenido)).toEqual(new Set(['bilbao|C0|m']));
  });
});

const perfiles: PerfilPrueba[] = [
  { id: 'a', grupo: 'normal', perfil: { destino: 'Sevilla', dias: 1, intereses: ['museos'] } },
  { id: 'b', grupo: 'fuera-corpus', perfil: { destino: 'Bilbao', dias: 1, intereses: ['museos'] } },
];

describe('pendientes', () => {
  it('cruza perfiles y modos, saltando lo ya hecho con el mismo modelo', () => {
    const hechos = new Set([clave('a', 'C0', 'm'), clave('b', 'C1', 'otro-modelo')]);

    expect(pendientes(perfiles, ['C0', 'C1'], null, hechos, 'm').map((p) => `${p.perfil.id}|${p.modo}`)).toEqual([
      'a|C1',
      'b|C0',
      'b|C1',
    ]);
  });

  it('filtra por los perfiles pedidos y avisa si alguno no existe', () => {
    expect(pendientes(perfiles, ['C0'], ['b'], new Set(), 'm').map((p) => p.perfil.id)).toEqual(['b']);
    expect(() => pendientes(perfiles, ['C0'], ['zzz'], new Set(), 'm')).toThrow('zzz');
  });
});

describe('juiciosPendientes', () => {
  const registro = (perfilId: string, modo: string, planificado = true) => ({
    perfilId,
    modo,
    modelos: { llm: 'qwen' },
    metricas: { planificado },
  });

  it('pide cada métrica de cada itinerario planificado, saltando lo ya juzgado por el mismo juez', () => {
    const registros = [registro('a', 'C0'), registro('a', 'C1'), registro('b', 'C1', false)];
    const hechos = new Set([claveJuicio('a', 'C0', 'qwen', 'gemma', 'relevancia'), claveJuicio('a', 'C1', 'qwen', 'otro', 'relevancia')]);

    expect(juiciosPendientes(registros, ['relevancia', 'viabilidad'], hechos, 'gemma').map((p) => `${p.registro.perfilId}|${p.registro.modo}|${p.metrica}`)).toEqual([
      'a|C0|viabilidad',
      'a|C1|relevancia',
      'a|C1|viabilidad',
    ]);
  });

  it('lee las claves de un fichero de juicios', () => {
    const linea = JSON.stringify({ perfilId: 'a', modo: 'C0', llm: 'qwen', juez: 'gemma', metrica: 'viabilidad', nota: 3 });
    expect(leerHechos(`${linea}\n`, claveDeJuicio)).toEqual(new Set([claveJuicio('a', 'C0', 'qwen', 'gemma', 'viabilidad')]));
  });
});
