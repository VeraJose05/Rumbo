// RF-05: esquema del itinerario día a día (mañana, tarde y noche) y reglas deterministas sobre él.
import { z } from 'genkit';
import { normalizar } from '../config/destinos.js';
import type { Perfil } from './perfil.js';

export const ActividadSchema = z.object({
  lugar: z.string(),
  descripcion: z.string(),
  /** Números de los textos de los que sale la actividad; vacío en C0, que no tiene fuentes. */
  citas: z.array(z.number().int()),
});

export const DiaSchema = z.object({
  dia: z.number().int().positive(),
  // Cada franja es una lista: según el ritmo, alguna puede ir vacía (p. ej. noche libre).
  manana: z.array(ActividadSchema),
  tarde: z.array(ActividadSchema),
  noche: z.array(ActividadSchema),
});

export type Actividad = z.infer<typeof ActividadSchema>;
export type Dia = z.infer<typeof DiaSchema>;

const ACTIVIDADES_POR_RITMO: Record<Perfil['ritmo'], number> = { tranquilo: 2, normal: 3, intenso: 4 };

export function actividadesPorDia(ritmo: Perfil['ritmo']): number {
  return ACTIVIDADES_POR_RITMO[ritmo];
}

export const FRANJAS = ['manana', 'tarde', 'noche'] as const;

/**
 * Esquema que se impone al modelo para generar un día: una lista con exactamente las actividades
 * que pide el ritmo, cada una con su franja. Con franjas separadas el modelo no respetaba el total
 * (6 actividades con ritmo tranquilo); con min y max iguales, Ollama no le deja generar otro número.
 * Con fuentes (C1, C2) cada actividad cita al menos un texto; sin fuentes (C0) no hay nada que citar.
 */
export function esquemaDiaModelo({ conCitas, actividades }: { conCitas: boolean; actividades: number }) {
  const base = { franja: z.enum(FRANJAS), lugar: z.string(), descripcion: z.string() };
  const actividad = conCitas ? z.object({ ...base, citas: z.array(z.number().int()).min(1) }) : z.object(base);
  return z.object({ actividades: z.array(actividad).min(actividades).max(actividades) });
}

/**
 * Agrupa por franja las actividades generadas, quitando las repetidas en el día o ya usadas antes,
 * hasta un máximo opcional.
 */
export function repartirEnFranjas(
  dia: number,
  actividades: { franja: (typeof FRANJAS)[number]; lugar: string; descripcion: string; citas?: number[] }[],
  usados: string[],
  maximo = Infinity,
): Dia {
  const vistos = new Set(usados.map(normalizar));
  const resultado: Dia = { dia, manana: [], tarde: [], noche: [] };
  for (const { franja, lugar, descripcion, citas = [] } of actividades) {
    if (vistos.has(normalizar(lugar)) || totalActividades(resultado) >= maximo) continue;
    vistos.add(normalizar(lugar));
    resultado[franja].push({ lugar, descripcion, citas });
  }
  return resultado;
}

export function totalActividades(dia: Dia): number {
  return dia.manana.length + dia.tarde.length + dia.noche.length;
}

/** Lugares ya incluidos en el itinerario, para no repetirlos en los días siguientes. */
export function lugaresUsados(dias: Dia[]): string[] {
  const lugares = dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche].map((a) => a.lugar));
  return [...new Set(lugares)];
}
