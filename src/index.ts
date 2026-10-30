// Punto de entrada: registra los flows para la Developer UI de Genkit (npm run dev).
import { cargarConfigChroma } from './config/chroma.js';
import { cargarConfigModelos } from './config/modelos.js';
import { definirEntrevistaFlow } from './flows/entrevista.js';
import { definirPlanificacionFlow } from './flows/planificacion.js';
import { definirPreguntaFlow } from './flows/pregunta.js';
import { definirPruebaFlow } from './flows/prueba.js';
import { definirRecuperadorChroma, definirRecuperadorHibrido } from './flows/recuperador.js';
import { crearAi } from './genkit.js';
import { abrirColeccion } from './ingest/chroma.js';
import { crearReranker } from './modelos/reranker.js';

export const configModelos = cargarConfigModelos();
export const ai = crearAi(configModelos);
export const pruebaFlow = definirPruebaFlow(ai);
export const entrevistaFlow = definirEntrevistaFlow(ai);

export const coleccion = await abrirColeccion(cargarConfigChroma());
const recuperador = definirRecuperadorChroma(ai, coleccion, `ollama/${configModelos.embedder}`);
export const preguntaFlow = definirPreguntaFlow(ai, recuperador);
// C2: el reranker solo se llama al planificar en ese modo, así que C0 y C1 funcionan sin él.
const recuperadorAvanzado = definirRecuperadorHibrido(ai, coleccion, `ollama/${configModelos.embedder}`, crearReranker(configModelos.rerankerUrl));
export const planificacionFlow = definirPlanificacionFlow(ai, recuperador, recuperadorAvanzado);
