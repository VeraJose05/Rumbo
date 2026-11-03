// RNF-10: índice vectorial en memoria. Con unos cientos de fragmentos, comparar la consulta con
// todos (búsqueda exacta) tarda menos de un milisegundo: no hace falta el índice aproximado de Chroma.
import { readFile } from 'node:fs/promises';
import { z } from 'genkit';
import type { Almacen, FragmentoAlmacen } from './almacen.js';

const RegistroIndiceSchema = z.object({
  id: z.string(),
  texto: z.string(),
  metadata: z.record(z.unknown()),
  embedding: z.array(z.number()).min(1),
});

// El modelo de embeddings se guarda con el índice: la consulta debe vectorizarse con el mismo,
// o las distancias no significan nada.
const IndiceSchema = z
  .object({ modeloEmbeddings: z.string().min(1), registros: z.array(RegistroIndiceSchema).min(1) })
  .refine((i) => i.registros.every((r) => r.embedding.length === i.registros[0]!.embedding.length), {
    message: 'Todos los vectores del índice deben tener la misma dimensión',
  });

export type RegistroIndice = z.infer<typeof RegistroIndiceSchema>;
export type Indice = z.infer<typeof IndiceSchema>;

/** Lee y valida un índice exportado de Chroma (npm run exportar-indice). */
export function leerIndice(texto: string): Indice {
  return IndiceSchema.parse(JSON.parse(texto));
}

/** 1 − coseno, la misma distancia que usa la colección de Chroma: 0 = mismo sentido, 2 = opuestos. */
export function distanciaCoseno(a: number[], b: number[]): number {
  let producto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    producto += a[i]! * b[i]!;
    normaA += a[i]! * a[i]!;
    normaB += b[i]! * b[i]!;
  }
  return 1 - producto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

export function crearAlmacenMemoria(registros: RegistroIndice[]): Almacen {
  const sinVector = ({ id, texto, metadata }: RegistroIndice): FragmentoAlmacen => ({ id, texto, metadata });
  const delDestino = (destino: string) => registros.filter((r) => r.metadata.destino === destino);
  return {
    async buscar(vector, n, destino) {
      return delDestino(destino)
        .map((r) => ({ ...sinVector(r), distancia: distanciaCoseno(vector, r.embedding) }))
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, n);
    },
    async fragmentos(destino) {
      return delDestino(destino).map(sinVector);
    },
  };
}

/** Carga el índice de disco; falla si se exportó con otro modelo de embeddings que el configurado. */
export async function abrirIndice(ruta: string, embedder: string): Promise<Almacen> {
  const indice = leerIndice(await readFile(ruta, 'utf8'));
  if (indice.modeloEmbeddings !== embedder) {
    throw new Error(`El índice ${ruta} se hizo con ${indice.modeloEmbeddings}, pero el embedder configurado es ${embedder}`);
  }
  return crearAlmacenMemoria(indice.registros);
}
