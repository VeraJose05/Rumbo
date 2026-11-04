// RF-12: API HTTP con los flows de entrevista y planificación, y la web de Rumbo (carpeta web/)
// en la raíz (npm run api). Sin estado: el cliente guarda el estado de la
// entrevista y lo envía en cada mensaje. En local solo escucha en 127.0.0.1: los datos del viajero
// no salen del equipo (RNF-09). En el despliegue (RNF-10) escucha en 0.0.0.0.
import express, { type RequestHandler } from 'express';
import type { Action } from 'genkit';
import { getCallableJSON, getHttpStatus } from 'genkit/context';
import { fileURLToPath } from 'node:url';
import { proveedoresExternos } from './config/modelos.js';
import { ajusteFlow, configModelos, entrevistaFlow, planificacionFlow } from './index.js';

// Render indica el puerto en PORT (RNF-10).
const PUERTO = Number(process.env.RUMBO_API_PUERTO) || Number(process.env.PORT) || 3400;
const HOST = process.env.RUMBO_API_HOST || '127.0.0.1';

const app = express();
app.use(express.json());
// La web (React, RF-12) compilada por Vite en web/dist. Desde dist/, web/ está un nivel más arriba.
app.use(express.static(fileURLToPath(new URL('../web/dist', import.meta.url))));
// Cada flow en POST /<nombre>, con el cuerpo {"data": entrada}; responde {"result": salida} o, si
// falla, {status, message} con su código HTTP (429 si se agota la cuota del LLM, RNF-10).
// Sustituye a expressHandler de @genkit-ai/express: su package.json carga la versión CommonJS de
// Genkit, cuyas clases de error no son las nuestras (ESM), y todo error salía como «Internal Error».
function manejador(flow: Action): RequestHandler {
  return async (peticion, respuesta) => {
    try {
      const { result } = await flow.run(peticion.body?.data);
      respuesta.json({ result });
    } catch (error) {
      console.error(error);
      respuesta.status(getHttpStatus(error)).json(getCallableJSON(error));
    }
  };
}

app.post('/entrevistaFlow', manejador(entrevistaFlow));
app.post('/planificacionFlow', manejador(planificacionFlow));
app.post('/ajusteFlow', manejador(ajusteFlow));
app.get('/salud', (_peticion, respuesta) => {
  respuesta.json({ ok: true });
});
// RNF-09: la web avisa de los servicios externos que reciben los mensajes (ninguno en local).
app.get('/info', (_peticion, respuesta) => {
  respuesta.json({ proveedores: proveedoresExternos(configModelos) });
});

app.listen(PUERTO, HOST, () => {
  console.log(`Rumbo en http://${HOST}:${PUERTO} (web y API: entrevistaFlow, planificacionFlow, ajusteFlow)`);
});
