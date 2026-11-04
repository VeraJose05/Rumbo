// RF-12 (PWA): qué archivos de web/dist se guardan para usar Rumbo sin conexión.
import { describe, expect, it } from 'vitest';
import { listaPrecache, versionCache } from './precache.ts';

describe('listaPrecache', () => {
  it('incluye la web compilada como rutas absolutas y la portada como «/»', () => {
    const lista = listaPrecache(['index.html', 'assets/index-abc.js', 'fuentes/inter.woff2', 'manifest.webmanifest']);
    expect(lista).toEqual(['/', '/assets/index-abc.js', '/fuentes/inter.woff2', '/manifest.webmanifest']);
  });

  it('deja fuera el propio service worker, los mapas de código y las rutas de Windows', () => {
    expect(listaPrecache(['sw.js', 'assets/x.js.map', 'fotos\\sevilla.webp'])).toEqual(['/fotos/sevilla.webp']);
  });

  it('deja fuera el mapa: pesa mucho y sin red no sirve (sus teselas vienen de fuera)', () => {
    expect(listaPrecache(['assets/MapaDia-abc.js', 'assets/MapaDia-abc.css', 'assets/maplibre-gl-worker-abc.js', 'assets/index-x.js'])).toEqual(['/assets/index-x.js']);
  });

  it('ordena la lista para que la versión no dependa del orden del disco', () => {
    expect(listaPrecache(['b.css', 'a.css'])).toEqual(['/a.css', '/b.css']);
  });
});

describe('versionCache', () => {
  it('cambia si cambia el contenido de algún archivo, aunque se llame igual', () => {
    const a = versionCache([['fotos/x.webp', Buffer.from('uno')]]);
    const b = versionCache([['fotos/x.webp', Buffer.from('dos')]]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
  });

  it('es estable para el mismo contenido', () => {
    expect(versionCache([['a', Buffer.from('1')]])).toBe(versionCache([['a', Buffer.from('1')]]));
  });
});
