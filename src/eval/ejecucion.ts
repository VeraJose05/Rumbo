// F5 (RNF-03): argumentos de la evaluación y qué ejecuciones quedan pendientes. Una pasada completa
// dura unos 20-30 minutos, así que se puede cortar y retomar sin repetir lo ya guardado.
import { z } from 'genkit';
import { MODOS } from '../flows/planificacion.js';
import type { PerfilPrueba } from './perfiles.js';

type Modo = (typeof MODOS)[number];

export interface Argumentos {
  modos: Modo[];
  /** null para todos los perfiles. */
  perfiles: string[] | null;
  salida: string;
}

const lista = (valor: string | undefined) => (valor ?? '').split(',').map((v) => v.trim()).filter(Boolean);

export function parsearArgumentos(argv: string[]): Argumentos {
  const argumentos: Argumentos = { modos: [...MODOS], perfiles: null, salida: 'resultados/evaluacion.jsonl' };
  for (let i = 0; i < argv.length; i += 2) {
    const [opcion, valor] = [argv[i], argv[i + 1]];
    if (opcion === '--modos') argumentos.modos = z.array(z.enum(MODOS)).min(1).parse(lista(valor));
    else if (opcion === '--perfiles') argumentos.perfiles = lista(valor);
    else if (opcion === '--salida' && valor) argumentos.salida = valor;
    else throw new Error(`Opción desconocida o sin valor: ${opcion}`);
  }
  return argumentos;
}

/** Identifica una ejecución. Incluye el modelo para que cambiarlo no reutilice resultados de otro. */
export const clave = (perfilId: string, modo: string, llm: string) => `${perfilId}|${modo}|${llm}`;

// Una línea de un fichero JSONL; si le falta un campo, su clave no coincidirá con ninguna.
type Linea = any;
const claveDeEjecucion = (r: Linea) => clave(r.perfilId, r.modo, r.modelos.llm);

/** Claves ya guardadas en un fichero de resultados o de juicios (un objeto JSON por línea). */
export function leerHechos(contenido: string, claveDe: (linea: Linea) => string = claveDeEjecucion): Set<string> {
  const hechos = new Set<string>();
  for (const linea of contenido.split('\n')) {
    try {
      hechos.add(claveDe(JSON.parse(linea)));
    } catch {
      // Línea vacía o a medias: la ejecución no terminó de guardarse y se repetirá.
    }
  }
  return hechos;
}

export function pendientes(
  perfiles: PerfilPrueba[],
  modos: Modo[],
  pedidos: string[] | null,
  hechos: Set<string>,
  llm: string,
): { perfil: PerfilPrueba; modo: Modo }[] {
  const desconocidos = (pedidos ?? []).filter((id) => !perfiles.some((p) => p.id === id));
  if (desconocidos.length) throw new Error(`Perfiles desconocidos: ${desconocidos.join(', ')}`);

  const elegidos = pedidos ? perfiles.filter((p) => pedidos.includes(p.id)) : perfiles;
  return elegidos
    .flatMap((perfil) => modos.map((modo) => ({ perfil, modo })))
    .filter(({ perfil, modo }) => !hechos.has(clave(perfil.id, modo, llm)));
}

/** Identifica un juicio: el itinerario (perfil, modo y generador), el juez y la métrica. */
export const claveJuicio = (perfilId: string, modo: string, llm: string, juez: string, metrica: string) =>
  `${perfilId}|${modo}|${llm}|${juez}|${metrica}`;

export const claveDeJuicio = (j: Linea) => claveJuicio(j.perfilId, j.modo, j.llm, j.juez, j.metrica);

interface RegistroEjecucion {
  perfilId: string;
  modo: string;
  modelos: { llm: string };
  metricas: { planificado: boolean };
}

/** Juicios que faltan: cada métrica de cada itinerario planificado (los que no planifican no se juzgan). */
export function juiciosPendientes<R extends RegistroEjecucion, M extends string>(
  registros: R[],
  metricas: readonly M[],
  hechos: Set<string>,
  juez: string,
): { registro: R; metrica: M }[] {
  return registros
    .filter((r) => r.metricas.planificado)
    .flatMap((registro) => metricas.map((metrica) => ({ registro, metrica })))
    .filter(({ registro: r, metrica }) => !hechos.has(claveJuicio(r.perfilId, r.modo, r.modelos.llm, juez, metrica)));
}
