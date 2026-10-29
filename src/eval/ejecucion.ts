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

/** Claves ya guardadas en el fichero de resultados (una ejecución en JSON por línea). */
export function leerHechos(contenido: string): Set<string> {
  const hechos = new Set<string>();
  for (const linea of contenido.split('\n')) {
    try {
      const registro = JSON.parse(linea);
      hechos.add(clave(registro.perfilId, registro.modo, registro.modelos.llm));
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
