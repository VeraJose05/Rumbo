// RF-12: rutas de la web en el hash de la URL.
import { describe, expect, it } from 'vitest';
import { leerRuta } from './ruta';

describe('leerRuta', () => {
  it('sin hash es la portada', () => {
    expect(leerRuta('')).toEqual({ pantalla: 'portada' });
    expect(leerRuta('#/')).toEqual({ pantalla: 'portada' });
  });

  it('lee el paso del recorrido', () => {
    expect(leerRuta('#/viaje/gustos')).toEqual({ pantalla: 'viaje', paso: 'gustos' });
  });

  it('un paso desconocido lleva al primero', () => {
    expect(leerRuta('#/viaje/otro')).toEqual({ pantalla: 'viaje', paso: 'destino' });
    expect(leerRuta('#/viaje')).toEqual({ pantalla: 'viaje', paso: 'destino' });
  });

  it('lee las pantallas de preparación e itinerario', () => {
    expect(leerRuta('#/preparando')).toEqual({ pantalla: 'preparando' });
    expect(leerRuta('#/itinerario')).toEqual({ pantalla: 'itinerario' });
  });

  it('una ruta desconocida lleva a la portada', () => {
    expect(leerRuta('#/nada')).toEqual({ pantalla: 'portada' });
  });
});
