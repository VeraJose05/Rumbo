// RF-12: API HTTP con los flows de entrevista y planificación, y la web de Rumbo (carpeta web/)
// en la raíz (npm run api). Sin estado: el cliente guarda el estado de la
// entrevista y lo envía en cada mensaje. Solo escucha en 127.0.0.1: los datos del viajero
// no salen del equipo (RNF-09).
import { expressHandler } from '@genkit-ai/express';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { ajusteFlow, entrevistaFlow, planificacionFlow } from './index.js';

const PUERTO = Number(process.env.RUMBO_API_PUERTO) || 3400;

const app = express();
app.use(express.json());
// La web: HTML, CSS y JS sin compilar. Desde dist/, la carpeta web/ está un nivel más arriba.
app.use(express.static(fileURLToPath(new URL('../web', import.meta.url))));
// Cada flow en POST /<nombre>, con el cuerpo {"data": entrada}; responde {"result": salida}.
app.post('/entrevistaFlow', expressHandler(entrevistaFlow));
app.post('/planificacionFlow', expressHandler(planificacionFlow));
app.post('/ajusteFlow', expressHandler(ajusteFlow));
app.get('/salud', (_peticion, respuesta) => {
  respuesta.json({ ok: true });
});

app.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Rumbo en http://127.0.0.1:${PUERTO} (web y API: entrevistaFlow, planificacionFlow, ajusteFlow)`);
});
