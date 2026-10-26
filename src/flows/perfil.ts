// RF-02: perfil estructurado del viajero validado con Zod.
// Un perfil inválido o incompleto no pasa a la planificación.
import { z } from 'genkit';

export const INTERESES = [
  'monumentos',
  'museos',
  'gastronomia',
  'naturaleza',
  'ocio-nocturno',
  'compras',
  'playa',
  'ninos',
] as const;

export const RITMOS = ['tranquilo', 'normal', 'intenso'] as const;
export const PRESUPUESTOS = ['bajo', 'medio', 'alto'] as const;
export const COMPANIAS = ['solo', 'pareja', 'familia', 'amigos'] as const;

const campos = {
  // No se limita a los destinos del corpus: fuera de él, el sistema debe decir que no tiene información.
  destino: z.string().trim().min(1),
  // Más de 7 días es demasiado itinerario para un modelo pequeño.
  dias: z.number().int().min(1).max(7),
  intereses: z
    .array(z.enum(INTERESES))
    .min(1)
    .transform((lista) => [...new Set(lista)]),
};

export const PerfilSchema = z.object({
  ...campos,
  ritmo: z.enum(RITMOS).default('normal'),
  presupuesto: z.enum(PRESUPUESTOS).default('medio'),
  compania: z.enum(COMPANIAS).default('solo'),
});

export type Perfil = z.infer<typeof PerfilSchema>;

/** Campos obligatorios que faltan o no son válidos, en el orden en que la entrevista los pregunta. */
export function camposPendientes(perfil: Record<string, unknown>): (keyof typeof campos)[] {
  return (Object.keys(campos) as (keyof typeof campos)[]).filter(
    (campo) => !campos[campo].safeParse(perfil[campo]).success,
  );
}
