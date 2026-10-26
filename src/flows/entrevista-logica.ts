// RF-01: lógica determinista de la entrevista: qué se guarda de cada respuesta,
// qué se pregunta después y cuándo se termina. El LLM no decide nada de esto.
import { z } from 'genkit';
import { camposPendientes, INTERESES, PerfilSchema, type Perfil } from './perfil.js';

export type PerfilParcial = Record<string, unknown>;

export interface EstadoEntrevista {
  perfil: PerfilParcial;
  /** Ritmo, presupuesto y compañía se preguntan una sola vez, al final. */
  opcionalesPreguntados: boolean;
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

  for (const campo of ['destino', 'dias', 'ritmo', 'presupuesto', 'compania'] as const) {
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

export function siguientePaso(estado: EstadoEntrevista): Paso {
  const [pendiente] = camposPendientes(estado.perfil);
  if (pendiente) return { tipo: 'preguntar', campo: pendiente };
  if (!estado.opcionalesPreguntados) return { tipo: 'preguntar', campo: 'opcionales' };
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
