// RF-04, RNF-10: lo que los recuperadores necesitan de una base vectorial. Hay dos implementaciones:
// Chroma (local y evaluación) y un índice en memoria (despliegue, sin servicios aparte).

export interface FragmentoAlmacen {
  id: string;
  texto: string;
  metadata: Record<string, unknown>;
  /** Distancia coseno a la consulta (solo en búsquedas). */
  distancia?: number;
}

export interface Almacen {
  /** Los n fragmentos del destino más cercanos al vector, de menor a mayor distancia. */
  buscar(vector: number[], n: number, destino: string): Promise<FragmentoAlmacen[]>;
  /** Todos los fragmentos del destino (BM25 y lectura de la guía). */
  fragmentos(destino: string): Promise<FragmentoAlmacen[]>;
}
