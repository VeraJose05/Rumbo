// RF-03, RNF-07: registros que se guardan en la base vectorial, uno por fragmento.
import { textoConContexto, type Fragmento } from './troceado.js';

export interface ArticuloDescargado {
  destino: string;
  url: string;
  revision: number;
  /** Fecha de descarga en formato AAAA-MM-DD. */
  fechaDescarga: string;
}

export interface MetadatosFragmento {
  destino: string;
  fuente: string;
  licencia: string;
  url: string;
  seccion: string;
  revision: number;
  fechaDescarga: string;
  // Chroma exige que los metadatos admitan claves arbitrarias.
  [clave: string]: string | number;
}

export interface Registro {
  /** Estable entre ejecuciones, para que reindexar sustituya en vez de duplicar. */
  id: string;
  /** Texto original del fragmento: es lo que se muestra y se cita. */
  documento: string;
  /** Texto con destino y sección delante: es lo que se convierte en embedding. */
  textoEmbedding: string;
  metadatos: MetadatosFragmento;
}

export function crearRegistros(articulo: ArticuloDescargado, fragmentos: Fragmento[]): Registro[] {
  return fragmentos.map((fragmento, i) => ({
    id: `wikivoyage:${articulo.destino}:${i}`,
    documento: fragmento.texto,
    textoEmbedding: textoConContexto(articulo.destino, fragmento),
    metadatos: {
      destino: articulo.destino,
      fuente: 'Wikivoyage',
      licencia: 'CC BY-SA 4.0',
      url: articulo.url,
      seccion: fragmento.seccion.join(' › '),
      revision: articulo.revision,
      fechaDescarga: articulo.fechaDescarga,
    },
  }));
}
