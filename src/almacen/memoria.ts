// RNF-10: índice vectorial en memoria. Con unos cientos de fragmentos, comparar la consulta con
// todos (búsqueda exacta) tarda menos de un milisegundo: no hace falta el índice aproximado de Chroma.
import type { Almacen, FragmentoAlmacen } from './almacen.js';

export interface RegistroIndice {
  id: string;
  texto: string;
  metadata: Record<string, unknown>;
  embedding: number[];
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
