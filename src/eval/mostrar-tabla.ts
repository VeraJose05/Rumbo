// F5: muestra y guarda la tabla de resultados por modo y grupo
// (npm run tabla -- [resultados/evaluacion.jsonl] [resultados/juicios.jsonl]).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cargarConfigModelos } from '../config/modelos.js';
import { agregar, tablaMarkdown } from './tabla.js';

const [resultados = 'resultados/evaluacion.jsonl', juicios = 'resultados/juicios.jsonl'] = process.argv.slice(2);
const leer = (fichero: string) =>
  existsSync(fichero) ? readFileSync(fichero, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];

const registros = leer(resultados);
const { juez } = cargarConfigModelos();
const tabla = tablaMarkdown(agregar(registros, leer(juicios), juez));
const generador = [...new Set(registros.map((r) => r.modelos.llm))].join(', ');

const texto = `Generador: ${generador} · Juez: ${juez} · ${registros.length} ejecuciones\n\n${tabla}\n`;
writeFileSync('resultados/tabla.md', texto);
console.log(texto);
