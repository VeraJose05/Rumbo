// RF-12: viajes guardados en el móvil («Mis viajes»), sin cuentas: viven en localStorage.
import type { Viaje } from '../viaje/ajustar';

export type ViajeConId = Viaje & { id: string };

export interface Guardado {
  viaje: ViajeConId;
  /** Fecha (ISO) de la última vez que se guardó. */
  guardado: string;
}

/** Lo pone el primero; si ya estaba (mismo id, p. ej. tras un ajuste), lo actualiza. */
export function guardarViaje(lista: Guardado[], viaje: ViajeConId, ahora: string): Guardado[] {
  return [{ viaje, guardado: ahora }, ...lista.filter((g) => g.viaje.id !== viaje.id)];
}

export function quitarViaje(lista: Guardado[], id: string): Guardado[] {
  return lista.filter((g) => g.viaje.id !== id);
}

export const estaGuardado = (lista: Guardado[], id: string) => lista.some((g) => g.viaje.id === id);
