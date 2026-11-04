// RF-14: ¿se puede situar este lugar en el mapa? El servidor usa las mismas coordenadas que la web
// (web/public/datos/coordenadas.json: Wikidata, Nominatim y Wikipedia) y el mismo criterio de
// búsqueda (compartido/ubicar.ts), para que lo que el planificador da por situable salga en el mapa.
import { readFileSync } from 'node:fs';
import { ubicarLugar, type LugarEnMapa } from '../compartido/ubicar.js';

export const RUTA_COORDENADAS = 'web/public/datos/coordenadas.json';

export type Localizable = (lugar: string, destino: string) => boolean;

// Una zona o un grupo no es un sitio al que ir, aunque nombre un barrio que sí está en el mapa.
const GRUPO = /^(bares|restaurantes|tiendas|terrazas|tabernas|locales|discotecas|zonas?|calles|mercadillos)\b/i;

/** Construye la comprobación a partir de los datos; un destino sin datos no filtra nada. */
export function crearLocalizable(destinos: Record<string, { lugares: LugarEnMapa[] }>): Localizable {
  return (lugar, destino) => {
    const lugares = destinos[destino]?.lugares;
    if (!lugares) return true;
    return !GRUPO.test(lugar.trim()) && ubicarLugar(lugar, destino, lugares) !== null;
  };
}

/** Lee las coordenadas de disco; sin el archivo (p. ej. en tests) no se filtra nada. */
export function cargarLocalizable(ruta = RUTA_COORDENADAS): Localizable | undefined {
  try {
    return crearLocalizable((JSON.parse(readFileSync(ruta, 'utf8')) as { destinos: Record<string, { lugares: LugarEnMapa[] }> }).destinos);
  } catch {
    return undefined;
  }
}
