// RF-12: la web de Rumbo con React + Vite. En desarrollo (npm run web) las llamadas a la API se
// pasan al servidor de Rumbo (npm run api, puerto 3400); en producción Express sirve web/dist.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = 'http://127.0.0.1:3400';
const RUTAS_API = ['/entrevistaFlow', '/planificacionFlow', '/ajusteFlow', '/info', '/salud'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(RUTAS_API.map((ruta) => [ruta, API])),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
