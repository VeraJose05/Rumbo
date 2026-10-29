// RF-04: consultas de recuperación a partir del perfil y fusión de sus resultados.
// Cada interés se busca con una frase que describe cómo hablaría de él una guía de viaje:
// en el experimento, «naturaleza» a secas recuperaba bares y «parques, jardines, río…» el río y los paseos.
import type { INTERESES, Perfil } from './perfil.js';

const CONSULTA_POR_INTERES: Record<(typeof INTERESES)[number], string> = {
  monumentos: 'monumentos, catedral, palacios, iglesias y edificios históricos que visitar',
  museos: 'museos, exposiciones, arte e historia',
  gastronomia: 'dónde comer, platos típicos, tapas y restaurantes',
  naturaleza: 'parques, jardines, río y espacios naturales para pasear',
  'ocio-nocturno': 'bares, copas, vida nocturna y salir de noche',
  compras: 'compras, tiendas, mercados y zonas comerciales',
  playa: 'playas y costa para bañarse',
  ninos: 'actividades y planes para niños y familias',
};

// Para que un perfil de solo gastronomía no se quede sin los lugares imprescindibles.
const CONSULTA_BASE = 'lo imprescindible que ver y hacer, lugares más famosos';

export function consultasDelPerfil(perfil: Perfil): { motivo: string; texto: string }[] {
  return [
    { motivo: 'imprescindible', texto: CONSULTA_BASE },
    ...perfil.intereses.map((interes) => ({ motivo: interes, texto: CONSULTA_POR_INTERES[interes] })),
  ];
}

/**
 * Junta los resultados de varias consultas tomando uno de cada una por turnos, sin repetir,
 * hasta el límite. Así todos los intereses quedan representados aunque uno puntúe más alto.
 */
export function fusionarResultados<T extends { id: string }>(listas: T[][], limite: number): T[] {
  const resultado: T[] = [];
  const vistos = new Set<string>();
  const maximo = Math.max(0, ...listas.map((l) => l.length));

  for (let posicion = 0; posicion < maximo; posicion++) {
    for (const lista of listas) {
      const elemento = lista[posicion];
      if (!elemento || vistos.has(elemento.id)) continue;
      vistos.add(elemento.id);
      resultado.push(elemento);
      if (resultado.length === limite) return resultado;
    }
  }
  return resultado;
}
