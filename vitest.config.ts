// Tests de Rumbo: backend (src) y web (web). web/dist es la web compilada por Vite: no se prueba.
// Los tests de componentes de React (*.test.tsx) usan jsdom, indicado en cada archivo.
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'web/dist/**', 'dist/**'],
  },
});
