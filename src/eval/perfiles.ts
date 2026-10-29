// F5 (RNF-03): conjunto fijo de perfiles de prueba. La evaluación parte del perfil ya completo,
// sin entrevista, para que los fallos de la entrevista no se mezclen con los del RAG.
import type { z } from 'genkit';
import type { PerfilSchema } from '../flows/perfil.js';

export type GrupoPerfil =
  /** Casos corrientes: la base de la comparación entre configuraciones. */
  | 'normal'
  /** Intereses que la guía del destino apenas cubre: donde el RAG se queda sin datos. */
  | 'poco-cubierto'
  /** Preferencias que chocan entre sí: ponen a prueba la relevancia. */
  | 'contradictorio'
  /** Destino sin guía en el corpus: el sistema debe decir que no tiene información (RF-07). */
  | 'fuera-corpus';

export interface PerfilPrueba {
  id: string;
  grupo: GrupoPerfil;
  perfil: z.input<typeof PerfilSchema>;
}

// Los días se mantienen cortos (1 a 5) porque cada día es una llamada al modelo en cada configuración.
export const PERFILES_PRUEBA: PerfilPrueba[] = [
  // Normales: 3 por destino.
  { id: 'sevilla-1', grupo: 'normal', perfil: { destino: 'Sevilla', dias: 2, intereses: ['monumentos', 'gastronomia'], ritmo: 'normal', presupuesto: 'medio', compania: 'pareja' } },
  { id: 'sevilla-2', grupo: 'normal', perfil: { destino: 'Sevilla', dias: 3, intereses: ['museos'], ritmo: 'tranquilo', presupuesto: 'bajo', compania: 'solo' } },
  { id: 'sevilla-3', grupo: 'normal', perfil: { destino: 'Sevilla', dias: 1, intereses: ['ocio-nocturno', 'gastronomia'], ritmo: 'intenso', presupuesto: 'alto', compania: 'amigos' } },
  { id: 'madrid-1', grupo: 'normal', perfil: { destino: 'Madrid', dias: 3, intereses: ['museos', 'monumentos'], ritmo: 'intenso', presupuesto: 'medio', compania: 'solo' } },
  { id: 'madrid-2', grupo: 'normal', perfil: { destino: 'Madrid', dias: 2, intereses: ['compras', 'gastronomia'], ritmo: 'normal', presupuesto: 'alto', compania: 'pareja' } },
  { id: 'madrid-3', grupo: 'normal', perfil: { destino: 'Madrid', dias: 4, intereses: ['naturaleza', 'museos'], ritmo: 'tranquilo', presupuesto: 'medio', compania: 'familia' } },
  { id: 'barcelona-1', grupo: 'normal', perfil: { destino: 'Barcelona', dias: 3, intereses: ['monumentos', 'playa'], ritmo: 'normal', presupuesto: 'medio', compania: 'familia' } },
  { id: 'barcelona-2', grupo: 'normal', perfil: { destino: 'Barcelona', dias: 2, intereses: ['ocio-nocturno', 'playa'], ritmo: 'intenso', presupuesto: 'bajo', compania: 'amigos' } },
  { id: 'barcelona-3', grupo: 'normal', perfil: { destino: 'Barcelona', dias: 5, intereses: ['museos', 'gastronomia'], ritmo: 'tranquilo', presupuesto: 'alto', compania: 'pareja' } },
  { id: 'granada-1', grupo: 'normal', perfil: { destino: 'Granada', dias: 2, intereses: ['monumentos'], ritmo: 'normal', presupuesto: 'bajo', compania: 'pareja' } },
  { id: 'granada-2', grupo: 'normal', perfil: { destino: 'Granada', dias: 1, intereses: ['monumentos', 'gastronomia'], ritmo: 'intenso', presupuesto: 'medio', compania: 'amigos' } },
  { id: 'granada-3', grupo: 'normal', perfil: { destino: 'Granada', dias: 3, intereses: ['naturaleza', 'monumentos'], ritmo: 'tranquilo', presupuesto: 'medio', compania: 'familia' } },
  { id: 'valencia-1', grupo: 'normal', perfil: { destino: 'Valencia', dias: 2, intereses: ['playa', 'gastronomia'], ritmo: 'tranquilo', presupuesto: 'medio', compania: 'familia' } },
  { id: 'valencia-2', grupo: 'normal', perfil: { destino: 'Valencia', dias: 3, intereses: ['museos', 'monumentos'], ritmo: 'normal', presupuesto: 'bajo', compania: 'solo' } },
  { id: 'valencia-3', grupo: 'normal', perfil: { destino: 'Valencia', dias: 1, intereses: ['ocio-nocturno'], ritmo: 'intenso', presupuesto: 'alto', compania: 'amigos' } },

  // Poco cubiertos: la guía apenas habla de estos intereses en ese destino.
  { id: 'sevilla-playa', grupo: 'poco-cubierto', perfil: { destino: 'Sevilla', dias: 2, intereses: ['playa'], ritmo: 'normal', compania: 'pareja' } },
  { id: 'madrid-ninos', grupo: 'poco-cubierto', perfil: { destino: 'Madrid', dias: 2, intereses: ['ninos'], ritmo: 'tranquilo', compania: 'familia' } },
  { id: 'granada-compras', grupo: 'poco-cubierto', perfil: { destino: 'Granada', dias: 2, intereses: ['compras'], ritmo: 'normal', compania: 'amigos' } },
  { id: 'sevilla-ninos', grupo: 'poco-cubierto', perfil: { destino: 'Sevilla', dias: 1, intereses: ['ninos', 'naturaleza'], ritmo: 'tranquilo', compania: 'familia' } },

  // Contradictorios: preferencias que chocan.
  { id: 'madrid-tranquilo-noche', grupo: 'contradictorio', perfil: { destino: 'Madrid', dias: 2, intereses: ['ocio-nocturno'], ritmo: 'tranquilo', compania: 'familia' } },
  { id: 'barcelona-compras-bajo', grupo: 'contradictorio', perfil: { destino: 'Barcelona', dias: 2, intereses: ['compras', 'gastronomia'], ritmo: 'normal', presupuesto: 'bajo', compania: 'solo' } },
  { id: 'valencia-ninos-noche', grupo: 'contradictorio', perfil: { destino: 'Valencia', dias: 2, intereses: ['ninos', 'ocio-nocturno'], ritmo: 'intenso', compania: 'familia' } },

  // Fuera del corpus: no hay guía de estos destinos.
  { id: 'bilbao', grupo: 'fuera-corpus', perfil: { destino: 'Bilbao', dias: 2, intereses: ['gastronomia'], compania: 'pareja' } },
  { id: 'toledo', grupo: 'fuera-corpus', perfil: { destino: 'Toledo', dias: 1, intereses: ['monumentos'], compania: 'solo' } },
  { id: 'japon', grupo: 'fuera-corpus', perfil: { destino: 'Japón', dias: 3, intereses: ['museos'], compania: 'amigos' } },
];
