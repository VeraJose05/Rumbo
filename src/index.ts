// Punto de entrada: registra los flows para la Developer UI de Genkit (npm run dev).
import { cargarConfigChroma } from './config/chroma.js';
import { cargarConfigModelos } from './config/modelos.js';
import { cargarSituar } from './config/coordenadas.js';
import { sinCobertura } from './config/cobertura.js';
import { definirAjusteFlow } from './flows/ajuste.js';
import { definirEntrevistaFlow } from './flows/entrevista.js';
import { definirPlanificacionFlow } from './flows/planificacion.js';
import { definirPreguntaFlow } from './flows/pregunta.js';
import { definirPruebaFlow } from './flows/prueba.js';
import { definirRecuperadorChroma, definirRecuperadorHibrido } from './flows/recuperador.js';
import { crearAi, nombreEmbedder } from './genkit.js';
import { abrirColeccion } from './ingest/chroma.js';
import { almacenChroma } from './almacen/chroma.js';
import { abrirIndice } from './almacen/memoria.js';
import { lectorCorpus } from './eval/entorno.js';
import { crearReranker } from './modelos/reranker.js';

export const configModelos = cargarConfigModelos();
export const ai = crearAi(configModelos);
export const pruebaFlow = definirPruebaFlow(ai);

// RNF-10: con RUMBO_INDICE se usa el índice exportado en memoria (despliegue); si no, Chroma.
export const almacen = process.env.RUMBO_INDICE
  ? await abrirIndice(process.env.RUMBO_INDICE, configModelos.embedder)
  : almacenChroma(await abrirColeccion(cargarConfigChroma()));
const recuperador = definirRecuperadorChroma(ai, almacen, nombreEmbedder(configModelos));
export const preguntaFlow = definirPreguntaFlow(ai, recuperador);
// La entrevista contesta las preguntas del viajero con la guía (RAG básico, C1).
export const entrevistaFlow = definirEntrevistaFlow(ai, {
  responder: (pregunta, destino) => preguntaFlow({ pregunta, destino }),
  leerGuia: lectorCorpus(almacen),
});
// C2: el reranker solo se llama al planificar en ese modo, así que C0 y C1 funcionan sin él.
const recuperadorAvanzado = definirRecuperadorHibrido(ai, almacen, nombreEmbedder(configModelos), crearReranker(configModelos.rerankerUrl));
// RF-14: el planificador cambia los lugares que no se pueden situar en el mapa por otros de la guía.
// Además, no repite el mismo sitio con otro nombre.
const situar = cargarSituar();
export const planificacionFlow = definirPlanificacionFlow(ai, recuperador, recuperadorAvanzado, sinCobertura, situar);
export const ajusteFlow = definirAjusteFlow(ai, recuperador, recuperadorAvanzado, sinCobertura, situar);
