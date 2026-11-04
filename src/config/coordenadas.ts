// RF-14: ¿dónde está este lugar (si se puede situar en el mapa)? El servidor usa las mismas coordenadas que la web
// (web/public/datos/coordenadas.json: Wikidata, Nominatim y Wikipedia) y el mismo criterio de
// búsqueda (compartido/ubicar.ts), para que lo que el planificador da por situable salga en el mapa.
import { readFileSync } from 'node:fs';
import { ubicarLugar, type LugarEnMapa, type Punto } from '../compartido/ubicar.js';

export const RUTA_COORDENADAS = 'web/public/datos/coordenadas.json';

/** Dónde está el lugar; null si no se puede situar en el mapa. */
export type Situar = (lugar: string, destino: string) => Punto | null;

/** Destino sin coordenadas: se da por situable y no coincide con ningún otro punto. */
const SIN_DATOS: Punto = { lat: Number.NaN, lon: Number.NaN };

// Una zona o un grupo no es un sitio al que ir, aunque nombre un barrio que sí está en el mapa.
const GRUPO = /^(bares|restaurantes|tiendas|terrazas|tabernas|locales|discotecas|zonas?|calles|mercadillos)\b/i;

/** Construye la búsqueda a partir de los datos; un destino sin datos no filtra nada. */
export function crearSituar(destinos: Record<string, { lugares: LugarEnMapa[] }>): Situar {
  return (lugar, destino) => {
    const lugares = destinos[destino]?.lugares;
    if (!lugares) return SIN_DATOS;
    if (GRUPO.test(lugar.trim())) return null;
    const encontrado = ubicarLugar(lugar, destino, lugares);
    return encontrado && { lat: encontrado.lat, lon: encontrado.lon };
  };
}

/** Lee las coordenadas de disco; sin el archivo (p. ej. en tests) no se filtra nada. */
export function cargarSituar(ruta = RUTA_COORDENADAS): Situar | undefined {
  try {
    return crearSituar((JSON.parse(readFileSync(ruta, 'utf8')) as { destinos: Record<string, { lugares: LugarEnMapa[] }> }).destinos);
  } catch {
    return undefined;
  }
}
