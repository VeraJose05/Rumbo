// Tests de Rumbo: backend (src) y web (web). web/dist es la web compilada por Vite: no se prueba.
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'web/dist/**', 'dist/**'],
  },
});
