// RF-03: troceado de un artículo limpio en fragmentos por sección.
// Cada sección se trocea por separado; las largas se agrupan por párrafos y viñetas,
// y un párrafo que no cabe se parte por frases.

export interface Fragmento {
  /** Ruta de la sección, p. ej. ['Pasear', 'En bicicleta']. */
  seccion: string[];
  texto: string;
}

export interface OpcionesTroceado {
  maxPalabras: number;
  /** Secciones que se ignoran, con todas sus subsecciones. */
  seccionesDescartadas: string[];
}

export const TROCEADO_POR_DEFECTO: OpcionesTroceado = {
  maxPalabras: 200,
  // Alojamiento, estudios, trabajo y contactos no aportan a un itinerario de actividades.
  // Cada artículo nombra las secciones a su manera («Dormir» o «Alojamiento»).
  seccionesDescartadas: [
    'Dormir',
    'Alojamiento',
    'Aprender',
    'Estudios',
    'Trabajar',
    'Conectarse',
    'Contactos de emergencia',
    'Salud',
    'Referencias',
    'Enlaces externos',
  ],
};

interface Seccion {
  ruta: string[];
  lineas: string[];
}

/** Trozo de texto que se agrupa con otros; `nuevoBloque` indica si empieza párrafo o viñeta. */
interface Pieza {
  texto: string;
  nuevoBloque: boolean;
}

export function trocearArticulo(texto: string, opciones: OpcionesTroceado): Fragmento[] {
  return separarSecciones(texto)
    .filter(({ ruta }) => !ruta.some((nombre) => opciones.seccionesDescartadas.includes(nombre)))
    .flatMap(({ ruta, lineas }) =>
      agrupar(dividirEnPiezas(lineas, opciones.maxPalabras), opciones.maxPalabras).map((texto) => ({
        seccion: ruta,
        texto,
      })),
    );
}

/**
 * Texto que se convierte en embedding: el fragmento precedido de su destino y sección,
 * para que el vector sepa de qué trata aunque el texto no lo diga.
 */
export function textoConContexto(destino: string, fragmento: Fragmento): string {
  return `${[destino, ...fragmento.seccion].join(' › ')}: ${fragmento.texto}`;
}

function separarSecciones(texto: string): Seccion[] {
  const secciones: Seccion[] = [{ ruta: ['Introducción'], lineas: [] }];
  let ruta: string[] = [];

  for (const linea of texto.split('\n')) {
    const titulo = /^(={2,})\s*(.*?)\s*=+$/.exec(linea);
    if (titulo) {
      // == Título == es nivel 0 de la ruta, === Título === nivel 1, etc.
      const nivel = (titulo[1] ?? '==').length - 2;
      ruta = [...ruta.slice(0, nivel), titulo[2] ?? ''];
      secciones.push({ ruta, lineas: [] });
    } else {
      secciones.at(-1)?.lineas.push(linea);
    }
  }
  return secciones;
}

/** Divide las líneas en párrafos y viñetas, y parte por frases los que no caben. */
function dividirEnPiezas(lineas: string[], maxPalabras: number): Pieza[] {
  const bloques: string[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push(parrafo.join(' '));
    parrafo = [];
  };

  for (const linea of lineas.map((l) => l.trim())) {
    if (!linea) cerrarParrafo();
    else if (linea.startsWith('*')) {
      cerrarParrafo();
      bloques.push(linea);
    } else parrafo.push(linea);
  }
  cerrarParrafo();

  return bloques.flatMap((bloque) => {
    if (contarPalabras(bloque) <= maxPalabras) return [{ texto: bloque, nuevoBloque: true }];
    return bloque.split(/(?<=[.!?])\s+/).map((frase, i) => ({ texto: frase, nuevoBloque: i === 0 }));
  });
}

/** Junta piezas consecutivas mientras no se supere el máximo de palabras. */
function agrupar(piezas: Pieza[], maxPalabras: number): string[] {
  const fragmentos: string[] = [];
  let actual = '';

  for (const { texto, nuevoBloque } of piezas) {
    if (actual && contarPalabras(actual) + contarPalabras(texto) > maxPalabras) {
      fragmentos.push(actual);
      actual = '';
    }
    actual = actual ? `${actual}${nuevoBloque ? '\n' : ' '}${texto}` : texto;
  }
  if (actual) fragmentos.push(actual);
  return fragmentos;
}

/** Cuenta palabras con letras o números (las viñetas «*» no cuentan). */
export function contarPalabras(texto: string): number {
  return texto.match(/\S*[\p{L}\p{N}]\S*/gu)?.length ?? 0;
}
