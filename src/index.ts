// Punto de entrada: registra los flows para la Developer UI de Genkit (npm run dev).
import { cargarConfigChroma } from './config/chroma.js';
import { cargarConfigModelos } from './config/modelos.js';
import { definirEntrevistaFlow } from './flows/entrevista.js';
import { definirPlanificacionFlow } from './flows/planificacion.js';
import { definirPreguntaFlow } from './flows/pregunta.js';
import { definirPruebaFlow } from './flows/prueba.js';
import { definirRecuperadorChroma } from './flows/recuperador.js';
import { crearAi } from './genkit.js';
import { abrirColeccion } from './ingest/chroma.js';

export const configModelos = cargarConfigModelos();
export const ai = crearAi(configModelos);
export const pruebaFlow = definirPruebaFlow(ai);
export const entrevistaFlow = definirEntrevistaFlow(ai);

export const coleccion = await abrirColeccion(cargarConfigChroma());
const recuperador = definirRecuperadorChroma(ai, coleccion, `ollama/${configModelos.embedder}`);
export const preguntaFlow = definirPreguntaFlow(ai, recuperador);
export const planificacionFlow = definirPlanificacionFlow(ai, recuperador);
