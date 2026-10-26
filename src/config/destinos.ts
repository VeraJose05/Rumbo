// RF-03: catálogo de destinos con guía en el corpus.
// El artículo se indica a mano porque el título simple no siempre es el bueno:
// en es.wikivoyage «Granada» es el país del Caribe y «Valencia» una página de desambiguación.

export interface Destino {
  /** Nombre que usa el viajero y que se guarda en los metadatos de cada fragmento. */
  nombre: string;
  /** Título del artículo de es.wikivoyage. */
  articulo: string;
}

export const DESTINOS: Destino[] = [
  { nombre: 'Sevilla', articulo: 'Sevilla' },
  { nombre: 'Madrid', articulo: 'Madrid' },
  { nombre: 'Barcelona', articulo: 'Barcelona' },
  { nombre: 'Granada', articulo: 'Granada (España)' },
  { nombre: 'Valencia', articulo: 'Valencia (España)' },
];

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

export function buscarDestino(nombre: string): Destino | undefined {
  return DESTINOS.find((d) => normalizar(d.nombre) === normalizar(nombre));
}
