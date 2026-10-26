// Punto de entrada: registra los flows para la Developer UI de Genkit (npm run dev).
import { cargarConfigModelos } from './config/modelos.js';
import { definirPruebaFlow } from './flows/prueba.js';
import { crearAi } from './genkit.js';

export const ai = crearAi(cargarConfigModelos());
export const pruebaFlow = definirPruebaFlow(ai);
