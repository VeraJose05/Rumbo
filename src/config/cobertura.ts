// RF-07: intereses que la guía de un destino no cubre (playas en Sevilla). Las notas son del
// reranker y se calculan una vez (npm run experimento:cobertura): solo dependen del destino y del
// interés, así que C1 no necesita el reranker ni tarda más.
import { NOTAS_COBERTURA } from './cobertura-datos.js';

// Conservador: en el experimento, por debajo de 0,03 ningún interés estaba cubierto; por encima
// hubo casos cubiertos con nota baja (Valencia-playa, 0,056, con sección «Playas»). Mejor callar
// a veces que avisar en falso.
export const UMBRAL_COBERTURA = 0.03;

/** Intereses del perfil que la guía del destino no cubre. Sin datos, se dan por cubiertos. */
export function sinCobertura<T extends string>(destino: string, intereses: T[], notas: Record<string, Record<string, number>> = NOTAS_COBERTURA): T[] {
  const delDestino = notas[destino];
  if (!delDestino) return [];
  return intereses.filter((i) => delDestino[i] !== undefined && delDestino[i] < UMBRAL_COBERTURA);
}
