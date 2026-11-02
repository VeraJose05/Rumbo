// Punto de entrada: registra los flows para la Developer UI de Genkit (npm run dev).
import { cargarConfigChroma } from './config/chroma.js';
import { cargarConfigModelos } from './config/modelos.js';
import { definirAjusteFlow } from './flows/ajuste.js';
import { definirEntrevistaFlow } from './flows/entrevista.js';
import { definirPlanificacionFlow } from './flows/planificacion.js';
import { definirPreguntaFlow } from './flows/pregunta.js';
import { definirPruebaFlow } from './flows/prueba.js';
import { definirRecuperadorChroma, definirRecuperadorHibrido } from './flows/recuperador.js';
import { crearAi } from './genkit.js';
import { abrirColeccion } from './ingest/chroma.js';
import { lectorCorpus } from './eval/entorno.js';
import { crearReranker } from './modelos/reranker.js';

export const configModelos = cargarConfigModelos();
export const ai = crearAi(configModelos);
export const pruebaFlow = definirPruebaFlow(ai);

export const coleccion = await abrirColeccion(cargarConfigChroma());
const recuperador = definirRecuperadorChroma(ai, coleccion, `ollama/${configModelos.embedder}`);
export const preguntaFlow = definirPreguntaFlow(ai, recuperador);
// La entrevista contesta las preguntas del viajero con la guía (RAG básico, C1).
export const entrevistaFlow = definirEntrevistaFlow(ai, {
  responder: (pregunta, destino) => preguntaFlow({ pregunta, destino }),
  leerGuia: lectorCorpus(coleccion),
});
// C2: el reranker solo se llama al planificar en ese modo, así que C0 y C1 funcionan sin él.
const recuperadorAvanzado = definirRecuperadorHibrido(ai, coleccion, `ollama/${configModelos.embedder}`, crearReranker(configModelos.rerankerUrl));
export const planificacionFlow = definirPlanificacionFlow(ai, recuperador, recuperadorAvanzado);
export const ajusteFlow = definirAjusteFlow(ai, recuperador, recuperadorAvanzado);
