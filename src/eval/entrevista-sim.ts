// RF-01: evaluación de la entrevista con un viajero simulado en código (sin LLM), para que sea
// determinista y repetible (RNF-03). El viajero mira qué le ha preguntado Rumbo y contesta lo que
// tiene previsto; al llegar a la confirmación se compara el perfil con el esperado, sin corregir nada
// (el criterio de RF-01 es completar el perfil sin intervención manual).
import type { z } from 'genkit';
import type { PerfilSchema } from '../flows/perfil.js';

export type GrupoConversacion =
  /** Todo dicho en el primer mensaje. */
  | 'todo-junto'
  /** Un dato por mensaje, respondiendo a lo que se pregunta. */
  | 'poco-a-poco'
  /** El viajero pregunta algo a mitad antes de contestar. */
  | 'con-preguntas'
  /** Intereses que se deducen de nombres propios («el Prado», «Gaudí»). */
  | 'nombres-propios'
  /** Expresiones que el extractor traducía mal («cultura», «barato», «fin de semana»). */
  | 'ambiguo'
  /** Primero un destino sin guía. */
  | 'fuera-corpus';

type Campo = 'destino' | 'dias' | 'intereses' | 'opcionales';

export interface Persona {
  id: string;
  grupo: GrupoConversacion;
  /** Primer mensaje, tras el saludo de Rumbo. */
  primero: string;
  /** Respuestas a cada pregunta, en orden; si se la vuelven a hacer, repite la última. */
  respuestas: Partial<Record<Campo, string[]>>;
  /** Pregunta que hace el viajero, una vez, antes de contestar a ese campo. */
  preguntas?: Partial<Record<Campo, string>>;
  esperado: z.input<typeof PerfilSchema>;
  /** Intereses que se aceptan estén o no («con mis hijos» puede dar el interés «niños»). */
  toleraIntereses?: string[];
}

export interface Respuesta {
  texto: string;
  esPregunta: boolean;
  /** Campo que contesta el mensaje; null si no contesta a nada (el primero, una pregunta, «no sé»). */
  respondeA: string | null;
}

/** Crea un viajero que contesta según lo último que le ha preguntado Rumbo. */
export function crearViajero(persona: Persona) {
  let empezado = false;
  const contestadas: Partial<Record<string, number>> = {};
  const preguntadas = new Set<string>();

  return {
    responder(campo: string): Respuesta {
      if (!empezado) {
        empezado = true;
        return { texto: persona.primero, esPregunta: false, respondeA: null };
      }
      const pregunta = persona.preguntas?.[campo as Campo];
      if (pregunta && !preguntadas.has(campo)) {
        preguntadas.add(campo);
        return { texto: pregunta, esPregunta: true, respondeA: null };
      }
      const lista = persona.respuestas[campo as Campo];
      if (!lista?.length) {
        return campo === 'opcionales'
          ? { texto: 'nada más', esPregunta: false, respondeA: campo }
          : { texto: 'no sé', esPregunta: false, respondeA: null };
      }
      const n = contestadas[campo] ?? 0;
      contestadas[campo] = n + 1;
      return { texto: lista[Math.min(n, lista.length - 1)]!, esPregunta: false, respondeA: campo };
    },
  };
}

const CAMPOS = ['destino', 'dias', 'intereses', 'ritmo', 'presupuesto', 'compania'] as const;
const POR_DEFECTO = { ritmo: 'normal', presupuesto: 'medio', compania: 'solo' };

export interface ErrorCampo {
  campo: string;
  esperado: unknown;
  obtenido: unknown;
}

/** Compara el perfil de la confirmación con el esperado; los opcionales no dichos valen lo de por defecto. */
export function compararPerfil(obtenido: Record<string, unknown>, persona: Persona): { correcto: boolean; errores: ErrorCampo[] } {
  const tolerados = new Set(persona.toleraIntereses ?? []);
  const intereses = (lista: unknown) => (Array.isArray(lista) ? [...new Set(lista as string[])].filter((i) => !tolerados.has(i)).sort() : []);
  const esperado: Record<string, unknown> = { ...POR_DEFECTO, ...persona.esperado };
  const real: Record<string, unknown> = { ...POR_DEFECTO, ...obtenido };

  const errores: ErrorCampo[] = [];
  for (const campo of CAMPOS) {
    const [e, o] = campo === 'intereses' ? [intereses(esperado[campo]), intereses(real[campo])] : [esperado[campo], real[campo]];
    if (JSON.stringify(e) !== JSON.stringify(o)) errores.push({ campo, esperado: e, obtenido: o });
  }
  return { correcto: errores.length === 0, errores };
}

export interface RegistroConversacion {
  id: string;
  grupo: GrupoConversacion;
  llegaAConfirmar: boolean;
  correcto: boolean;
  errores: ErrorCampo[];
  turnos: number;
  /** Veces que Rumbo vuelve a preguntar algo que el viajero acababa de contestar (y no era un destino sin guía). */
  repetidas: number;
  /** Turnos en que el guardarraíl descartó lo que redactó el modelo. */
  reservas: number;
  /** Preguntas del viajero contestadas con la guía (llevan enlace a Wikivoyage). */
  contestadasConGuia: number;
  preguntasDelViajero: number;
  segundos: number;
  conversacion: { rol: 'viajero' | 'rumbo'; texto: string }[];
}

/** Totales de la evaluación. */
export function resumir(registros: RegistroConversacion[]) {
  const suma = (f: (r: RegistroConversacion) => number) => registros.reduce((total, r) => total + f(r), 0);
  const erroresPorCampo: Record<string, number> = {};
  for (const r of registros) for (const e of r.errores) erroresPorCampo[e.campo] = (erroresPorCampo[e.campo] ?? 0) + 1;
  const turnosTotales = suma((r) => r.turnos);
  return {
    conversaciones: registros.length,
    llegan: suma((r) => Number(r.llegaAConfirmar)),
    correctas: suma((r) => Number(r.correcto)),
    erroresPorCampo,
    turnosMedios: turnosTotales / registros.length,
    repetidas: suma((r) => r.repetidas),
    reservas: suma((r) => r.reservas),
    turnosTotales,
    preguntasDelViajero: suma((r) => r.preguntasDelViajero),
    contestadasConGuia: suma((r) => r.contestadasConGuia),
    segundosPorTurno: suma((r) => r.segundos) / turnosTotales,
  };
}
