// RF-14: cada parada del itinerario se busca entre los lugares geolocalizados de la guía.
import { describe, expect, it } from 'vitest';
import { ubicarLugar, urlComoLlegar, urlRutaDelDia, type LugarEnMapa } from './mapa';

const lugar = (nombre: string, lat = 37.38, lon = -5.99): LugarEnMapa => ({ nombre, seccion: 'Ver', lat, lon });
const SEVILLA = [lugar('Catedral de Sevilla', 1, 1), lugar('La Giralda', 2, 2), lugar('Torre del Oro', 3, 3), lugar('Triana', 4, 4), lugar('Plaza de España', 5, 5)];

describe('ubicarLugar', () => {
  it('encuentra el lugar con el mismo nombre, sin mirar tildes ni mayúsculas', () => {
    expect(ubicarLugar('torre del oro', 'Sevilla', SEVILLA)?.lat).toBe(3);
  });

  it('acepta el nombre con la ciudad al final o con la dirección entre paréntesis', () => {
    expect(ubicarLugar('Catedral', 'Sevilla', SEVILLA)?.lat).toBe(1);
    expect(ubicarLugar('Torre del Oro (Paseo de Colón)', 'Sevilla', SEVILLA)?.lat).toBe(3);
  });

  it('si la parada junta varios lugares, se queda con el primero que nombra', () => {
    expect(ubicarLugar('La Giralda y la Catedral de Sevilla', 'Sevilla', SEVILLA)?.lat).toBe(2);
  });

  it('encuentra el lugar de la guía dentro de un nombre más largo («Barrio de Triana»)', () => {
    expect(ubicarLugar('Barrio de Triana', 'Sevilla', SEVILLA)?.lat).toBe(4);
  });

  it('no se inventa la ubicación de lo que no está', () => {
    expect(ubicarLugar('Bar El Rinconcillo', 'Sevilla', SEVILLA)).toBeNull();
    expect(ubicarLugar('Sevilla', 'Sevilla', SEVILLA)).toBeNull();
  });

  it('una palabra genérica suelta no basta para casar con un lugar', () => {
    // «Plaza» sola no es «Plaza de España».
    expect(ubicarLugar('Plaza', 'Sevilla', SEVILLA)).toBeNull();
  });
});

describe('enlaces a Google Maps', () => {
  it('«Cómo llegar» a un lugar, a pie, buscándolo por nombre y ciudad', () => {
    const url = new URL(urlComoLlegar('Torre del Oro', 'Sevilla'));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('destination')).toBe('Torre del Oro, Sevilla');
    expect(url.searchParams.get('travelmode')).toBe('walking');
  });

  it('la ruta del día pasa por todas las paradas en orden', () => {
    const url = new URL(urlRutaDelDia(['Catedral de Sevilla', 'Puente de Triana', 'Terraza Colón'], 'Sevilla'));
    expect(url.searchParams.get('origin')).toBe('Catedral de Sevilla');
    expect(url.searchParams.get('waypoints')).toBe('Puente de Triana, Sevilla');
    expect(url.searchParams.get('destination')).toBe('Terraza Colón, Sevilla');
    expect(url.searchParams.get('travelmode')).toBe('walking');
  });

  it('con una sola parada, la ruta del día es «cómo llegar»', () => {
    expect(urlRutaDelDia(['Alhambra'], 'Granada')).toBe(urlComoLlegar('Alhambra', 'Granada'));
  });

  it('no repite la ciudad si el nombre ya la lleva', () => {
    expect(new URL(urlComoLlegar('Catedral de Sevilla', 'Sevilla')).searchParams.get('destination')).toBe('Catedral de Sevilla');
    expect(new URL(urlComoLlegar('Mercado de Valencia', 'Valencia')).searchParams.get('destination')).toBe('Mercado de Valencia');
  });
});
