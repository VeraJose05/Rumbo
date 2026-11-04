// RF-14: cada parada del itinerario se busca entre los lugares geolocalizados de la guía.
import { describe, expect, it } from 'vitest';
import { ubicarLugar, type LugarEnMapa } from './mapa';

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
