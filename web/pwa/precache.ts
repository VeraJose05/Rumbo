// RF-12 (PWA): lista de archivos de web/dist que el service worker guarda al instalarse, para que
// Rumbo abra sin conexión (portada, pasaporte, viajes guardados). Planificar sí necesita red.
import { createHash } from 'node:crypto';

const FUERA = [/^sw\.js$/, /\.map$/];

/** Rutas (relativas a dist) → URLs absolutas, ordenadas; index.html se pide como «/». */
export function listaPrecache(archivos: string[]): string[] {
  return archivos
    .map((a) => a.replaceAll('\\', '/'))
    .filter((a) => !FUERA.some((r) => r.test(a)))
    .map((a) => (a === 'index.html' ? '/' : `/${a}`))
    .sort();
}

/** Huella del contenido: si cambia cualquier archivo, el service worker usa una caché nueva. */
export function versionCache(archivos: [string, Uint8Array][]): string {
  const hash = createHash('sha256');
  for (const [ruta, contenido] of [...archivos].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(ruta).update(contenido);
  }
  return hash.digest('hex').slice(0, 12);
}
