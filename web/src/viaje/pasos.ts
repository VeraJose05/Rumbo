// RF-12: pasos del recorrido para armar el viaje y qué hace falta en cada uno para avanzar.
import type { Perfil } from './perfil';

export const PASOS = ['destino', 'gustos', 'estilo', 'billete'] as const;
export type Paso = (typeof PASOS)[number];

export const NOMBRES_PASO: Record<Paso, string> = { destino: 'Destino', gustos: 'Gustos', estilo: 'Estilo', billete: 'Billete' };

export function puedeSeguir(paso: Paso, perfil: Perfil): boolean {
  if (paso === 'destino') return Boolean(perfil.destino);
  if (paso === 'gustos') return perfil.intereses.length > 0;
  return true;
}

/** Primer paso anterior a `paso` que está incompleto (p. ej. al entrar por la URL); null si no hay. */
export function pasoPendiente(paso: Paso, perfil: Perfil): Paso | null {
  return PASOS.slice(0, PASOS.indexOf(paso)).find((p) => !puedeSeguir(p, perfil)) ?? null;
}
