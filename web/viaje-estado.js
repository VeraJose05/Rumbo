// RF-01, RF-12: perfil del viajero que se construye en los pasos de viaje.html. Los valores y límites
// son los del esquema del planificador (src/flows/perfil.ts), para que el perfil llegue válido.
import { DESTINOS_PORTADA } from './destinos.js';

export const DIAS_MIN = 1;
export const DIAS_MAX = 7;

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();

export function perfilInicial(destino) {
  const conGuia = DESTINOS_PORTADA.find((d) => normalizar(d.nombre) === normalizar(destino));
  return {
    destino: conGuia?.nombre ?? null,
    dias: 3,
    intereses: [],
    ritmo: 'normal',
    presupuesto: 'medio',
    compania: 'solo',
  };
}

export function cambiarDias(perfil, delta) {
  return { ...perfil, dias: Math.min(DIAS_MAX, Math.max(DIAS_MIN, perfil.dias + delta)) };
}

export function etiquetaDias(dias) {
  if (dias === 1) return 'Escapada de un día';
  if (dias === 2) return 'Fin de semana';
  if (dias <= 4) return 'Escapada larga';
  if (dias <= 6) return 'Viaje con calma';
  return 'Una semana entera';
}
