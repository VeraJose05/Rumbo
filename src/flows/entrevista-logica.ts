// RF-01: lógica determinista de la entrevista: qué se guarda de cada respuesta,
// qué se pregunta después y cuándo se termina. El LLM no decide nada de esto.
import { z } from 'genkit';
import { buscarDestino, DESTINOS } from '../config/destinos.js';
import { camposPendientes, INTERESES, PerfilSchema, type Perfil } from './perfil.js';

export type PerfilParcial = Record<string, unknown>;

export interface EstadoEntrevista {
  perfil: PerfilParcial;
  /** Preguntas ya hechas. Intereses y opcionales se preguntan siempre una vez, aunque ya haya datos. */
  preguntados: string[];
}

export type Paso =
  | { tipo: 'preguntar'; campo: 'destino' | 'dias' | 'intereses' | 'opcionales' }
  | { tipo: 'terminar'; perfil: Perfil };

export const ETIQUETAS_INTERES: Record<(typeof INTERESES)[number], string> = {
  monumentos: 'monumentos',
  museos: 'museos',
  gastronomia: 'gastronomía',
  naturaleza: 'naturaleza',
  'ocio-nocturno': 'ocio nocturno',
  compras: 'compras',
  playa: 'playa',
  ninos: 'niños',
};

const ETIQUETAS_COMPANIA: Record<Perfil['compania'], string> = {
  solo: 'viajando solo',
  pareja: 'en pareja',
  familia: 'en familia',
  amigos: 'con amigos',
};

/** Añade al perfil los datos extraídos de la última respuesta. Los valores inválidos se descartan. */
export function fusionarPerfil(perfil: PerfilParcial, extraido: PerfilParcial): PerfilParcial {
  const resultado: PerfilParcial = { ...perfil };
  const forma = PerfilSchema.shape;

  // Solo destinos con guía: si no, la entrevista vuelve a preguntar. Se guarda escrito como en el
  // catálogo («granada» → «Granada») para que coincida con los metadatos de Chroma.
  const destino = typeof extraido.destino === 'string' ? buscarDestino(extraido.destino) : undefined;
  if (destino) resultado.destino = destino.nombre;

  for (const campo of ['dias', 'ritmo', 'presupuesto', 'compania'] as const) {
    const valor = extraido[campo];
    if (valor === null || valor === undefined) continue;
    const validado = forma[campo].safeParse(valor);
    if (validado.success) resultado[campo] = validado.data;
  }

  const interesValido = z.enum(INTERESES);
  const nuevos = (Array.isArray(extraido.intereses) ? extraido.intereses : []).filter(
    (i) => interesValido.safeParse(i).success,
  );
  if (nuevos.length) {
    const anteriores = Array.isArray(perfil.intereses) ? perfil.intereses : [];
    resultado.intereses = [...new Set([...anteriores, ...nuevos])];
  }
  return resultado;
}

/**
 * Respuesta para un destino sin guía. La entrevista no lo acepta (el perfil sí admitiría cualquier
 * destino: los perfiles de prueba de la evaluación se crean directamente, sin entrevista).
 */
export function avisoDestino(destino: string): string | null {
  if (buscarDestino(destino)) return null;
  const nombres = DESTINOS.map((d) => d.nombre);
  const lista = `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
  return `Lo siento, todavía no tengo información de ${destino}. Puedo ayudarte con ${lista}. ¿A cuál te gustaría ir?`;
}

export function siguientePaso(estado: EstadoEntrevista): Paso {
  const [pendiente] = camposPendientes(estado.perfil);
  if (pendiente) return { tipo: 'preguntar', campo: pendiente };
  // «Voy con mis hijos» da el interés «niños», pero no dice qué más le gusta al viajero.
  if (!estado.preguntados.includes('intereses')) return { tipo: 'preguntar', campo: 'intereses' };
  if (!estado.preguntados.includes('opcionales')) return { tipo: 'preguntar', campo: 'opcionales' };
  return { tipo: 'terminar', perfil: PerfilSchema.parse(estado.perfil) };
}

export function resumirPerfil(perfil: Perfil): string {
  const dias = perfil.dias === 1 ? '1 día' : `${perfil.dias} días`;
  const intereses = perfil.intereses.map((i) => ETIQUETAS_INTERES[i]).join(', ');
  return (
    `${perfil.destino}, ${dias}, ${ETIQUETAS_COMPANIA[perfil.compania]}, ritmo ${perfil.ritmo}, ` +
    `presupuesto ${perfil.presupuesto}. Intereses: ${intereses}.`
  );
}
