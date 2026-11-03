// RNF-10: exporta la colección de Chroma (textos, metadatos y vectores) a un JSON para desplegar
// sin Chroma (npm run exportar-indice [ruta]). Hay que repetirlo tras cada ingesta.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { leerIndice, type Indice } from '../almacen/memoria.js';
import { cargarConfigChroma } from '../config/chroma.js';
import { cargarConfigModelos } from '../config/modelos.js';
import { abrirColeccion } from './chroma.js';

const ruta = process.argv[2] ?? 'indice/destinos.json';
const coleccion = await abrirColeccion(cargarConfigChroma());
const resultado = await coleccion.get({ include: ['documents', 'metadatas', 'embeddings'] });
const indice: Indice = {
  modeloEmbeddings: cargarConfigModelos().embedder,
  registros: resultado.rows().map((f) => ({
    id: f.id,
    texto: f.document ?? '',
    metadata: { ...f.metadata },
    // Cuatro decimales bastan para el coseno y reducen el archivo a menos de la mitad.
    embedding: Array.from(f.embedding ?? [], (x) => Math.round(x * 1e4) / 1e4),
  })),
};
const texto = JSON.stringify(indice);
leerIndice(texto); // valida antes de escribir
await mkdir(dirname(ruta), { recursive: true });
await writeFile(ruta, texto);
console.log(`Exportados ${indice.registros.length} fragmentos a ${ruta} (${(texto.length / 1e6).toFixed(1)} MB).`);
