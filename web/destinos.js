// RF-12: destinos de la portada (los cinco con guía en el corpus, RF-03), con su foto de Wikimedia
// Commons y el crédito que exige la licencia CC BY-SA. El nombre coincide con el del planificador.

export const DESTINOS_PORTADA = [
  {
    nombre: 'Sevilla',
    pista: 'El Alcázar, Triana y el tapeo',
    region: 'Andalucía',
    foto: 'fotos/destinos/sevilla.webp',
    credito: { autor: 'Berthold Werner', licencia: 'CC BY-SA 3.0', fuente: 'https://commons.wikimedia.org/wiki/File:Spain_Andalusia_Seville_BW_2015-10-23_15-40-35.jpg' },
  },
  {
    nombre: 'Granada',
    pista: 'La Alhambra y el Albaicín',
    region: 'Andalucía',
    foto: 'fotos/destinos/granada.webp',
    credito: { autor: 'Alan.lorenzo', licencia: 'CC BY-SA 3.0', fuente: 'https://commons.wikimedia.org/wiki/File:Alhambra_desde_Albaicin.jpg' },
  },
  {
    nombre: 'Madrid',
    pista: 'El Prado, el Retiro y los Austrias',
    region: 'Comunidad de Madrid',
    foto: 'fotos/destinos/madrid.webp',
    credito: { autor: 'Carlos Delgado', licencia: 'CC BY-SA 4.0', fuente: 'https://commons.wikimedia.org/wiki/File:Gran_V%C3%ADa_-_01.jpg' },
  },
  {
    nombre: 'Barcelona',
    pista: 'Gaudí, el Gótico y la playa',
    region: 'Cataluña',
    foto: 'fotos/destinos/barcelona.webp',
    credito: { autor: 'Bernard Gagnon', licencia: 'CC BY-SA 3.0', fuente: 'https://commons.wikimedia.org/wiki/File:Sagrada_Familia_03.jpg' },
  },
  {
    nombre: 'Valencia',
    pista: 'La Ciudad de las Artes y la paella',
    region: 'Comunitat Valenciana',
    foto: 'fotos/destinos/valencia.webp',
    credito: {
      autor: 'Diego Delso',
      licencia: 'CC BY-SA 3.0',
      fuente: 'https://commons.wikimedia.org/wiki/File:Ciudad_de_las_Artes_y_las_Ciencias,_Valencia,_Espa%C3%B1a,_2014-06-29,_DD_39.JPG',
    },
  },
];

/** Índice de la historia siguiente (+1) o anterior (−1), dando la vuelta en los extremos. */
export function otraHistoria(actual, total, sentido) {
  return (actual + sentido + total) % total;
}

export function creditoFoto({ autor, licencia }) {
  return `Foto: ${autor} · ${licencia}`;
}
