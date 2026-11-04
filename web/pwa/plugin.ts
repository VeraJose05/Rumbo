// RF-12 (PWA): plugin de Vite que, al acabar el build, escribe dist/sw.js a partir de
// pwa/sw.js con la lista de archivos a guardar y la versión de la caché.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { listaPrecache, versionCache } from './precache.ts';

export function pwa(rutasApi: string[]): Plugin {
  let salida = '';
  return {
    name: 'rumbo-pwa',
    apply: 'build',
    configResolved(config) {
      salida = config.build.outDir.startsWith('/') ? config.build.outDir : join(config.root, config.build.outDir);
    },
    closeBundle() {
      const archivos = readdirSync(salida, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => relative(salida, join(e.parentPath, e.name)));
      const lista = listaPrecache(archivos);
      const version = versionCache(archivos.map((a) => [a, readFileSync(join(salida, a))]));
      const plantilla = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
      writeFileSync(
        join(salida, 'sw.js'),
        plantilla
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace('[/* __PRECACHE__ */]', JSON.stringify(lista))
          .replace('[/* __API__ */]', JSON.stringify(rutasApi)),
      );
    },
  };
}
