// RF-03: limpieza del wikitexto de Wikivoyage para dejar solo texto legible.
// Se conservan los títulos de sección (== Ver ==) y las viñetas (*) porque el troceado los usa.

// Plantillas de Wikivoyage que describen un lugar (qué ver, dónde comer, dormir...).
const PLANTILLAS_LISTADO = new Set(['listado', 'ver', 'hacer', 'comprar', 'comer', 'beber', 'dormir', 'ir']);

const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', ndash: '–', mdash: '—' };

/** Convierte wikitexto en texto plano. */
export function limpiarWikitexto(wikitexto: string): string {
  let texto = wikitexto
    // Referencias y comentarios
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|<references\s*\/>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Tablas (horarios, tarifas): no se buscan bien por significado
    .replace(/^\s*:?\{\|[\s\S]*?^\s*\|\}/gm, '')
    // Etiquetas HTML: los superíndices son llamadas a notas; del resto se conserva el texto
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    // Imágenes y categorías; el pie de imagen puede llevar enlaces anidados
    .replace(/\[\[(?:Archivo|Imagen|File|Image|Categoría|Category):(?:[^[\]]|\[\[[^\]]*\]\])*\]\]/gi, '')
    // [[destino|texto]] → texto, [[destino]] → destino
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    // [url texto] → texto, [url] → nada
    .replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, '$1')
    // Negritas y cursivas
    .replace(/'{2,}/g, '')
    .replace(/&(\w+);/g, (entidad, nombre: string) => ENTIDADES[nombre] ?? entidad);

  texto = sustituirPlantillas(texto);

  return texto
    .split('\n')
    .map((linea) => linea.replace(/ {2,}/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Sustituye las plantillas de dentro hacia fuera, para soportar plantillas anidadas. */
function sustituirPlantillas(texto: string): string {
  const plantillaSinAnidar = /\{\{([^{}]*)\}\}/g;
  let anterior;
  do {
    anterior = texto;
    texto = texto.replace(plantillaSinAnidar, (_, contenido: string) => convertirPlantilla(contenido));
  } while (texto !== anterior);
  return texto;
}

function convertirPlantilla(contenido: string): string {
  const [nombreCrudo = '', ...partes] = contenido.split('|');
  const nombre = nombreCrudo.trim().toLowerCase();
  const parametros = leerParametros(partes);

  if (nombre === 'top') return parametros.get('intro') ?? '';

  if (PLANTILLAS_LISTADO.has(nombre)) {
    const lugar = parametros.get('nombre') ?? '';
    const direccion = parametros.get('dirección');
    const descripcion = parametros.get('descripción');
    const cabecera = direccion ? `${lugar} (${direccion})` : lugar;
    return descripcion ? `${cabecera}: ${descripcion}` : cabecera;
  }

  return '';
}

/** Lee los parámetros «clave = valor» de una plantilla, ignorando los vacíos. */
function leerParametros(partes: string[]): Map<string, string> {
  const parametros = new Map<string, string>();
  for (const parte of partes) {
    const igual = parte.indexOf('=');
    if (igual === -1) continue;
    const clave = parte.slice(0, igual).trim().toLowerCase();
    const valor = parte.slice(igual + 1).replace(/\s+/g, ' ').trim();
    if (valor) parametros.set(clave, valor);
  }
  return parametros;
}
