// RNF-02: ejecuta el flow de prueba contra Ollama desde la consola (npm run flow:prueba -- "pregunta").
import { pruebaFlow } from './index.js';

const pregunta = process.argv.slice(2).join(' ') || '¿Qué ver en un día en Sevilla?';
const inicio = performance.now();
const { respuesta } = await pruebaFlow({ pregunta });
const segundos = ((performance.now() - inicio) / 1000).toFixed(1);

console.log(`Pregunta: ${pregunta}\n\n${respuesta}\n\n(${segundos} s)`);
