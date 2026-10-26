// RF-05: esquema del itinerario día a día (mañana, tarde y noche) y reglas deterministas sobre él.
import { z } from 'genkit';
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

/**
 * Esquema que se impone al modelo para generar un día. Con fuentes (C1, C2) cada actividad
 * tiene que citar al menos un texto; sin fuentes (C0) no hay nada que citar.
 */
export function esquemaDiaModelo({ conCitas }: { conCitas: boolean }) {
  const actividad = conCitas
    ? z.object({ lugar: z.string(), descripcion: z.string(), citas: z.array(z.number().int()).min(1) })
    : z.object({ lugar: z.string(), descripcion: z.string() });
  return z.object({ manana: z.array(actividad), tarde: z.array(actividad), noche: z.array(actividad) });
}

/** Lugares ya incluidos en el itinerario, para no repetirlos en los días siguientes. */
export function lugaresUsados(dias: Dia[]): string[] {
  const lugares = dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche].map((a) => a.lugar));
  return [...new Set(lugares)];
}
