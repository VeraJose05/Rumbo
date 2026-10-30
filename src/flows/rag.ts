// RF-04, RF-06: prompt de generación con fragmentos numerados y comprobación de las citas.

export interface FragmentoRecuperado {
  texto: string;
  seccion: string;
}

// RNF-05: en español. Modo estricto: solo la información de los textos recuperados.
// El formato lo impone el esquema de salida; aquí se explica qué va en cada campo.
function sistemaRag(destino: string): string {
  return `Eres un asistente de viajes. Responde en español usando SOLO la información de los textos que te da el usuario.

Rellena los campos así:
- hayInformacion: true si los textos responden a la pregunta; false si no.
- recomendaciones: si hayInformacion es true, una entrada por cada lugar, plato o actividad que responda a la pregunta, con "citas" = números de los textos de los que sale. Si es false, lista vacía.
- respuesta: un resumen breve dirigido al viajero, sin números de cita y sin mencionar los textos. Si no hay información, di «No tengo información sobre … en ${destino}.»

No añadas lugares, precios ni horarios que no aparezcan en los textos.`;
}

export function construirPromptRag(
  pregunta: string,
  destino: string,
  fragmentos: FragmentoRecuperado[],
): { system: string; prompt: string } {
  const lista = fragmentos.map((f, i) => `[${i + 1}] (${destino} › ${f.seccion}) ${f.texto}`);
  return { system: sistemaRag(destino), prompt: ['Textos:', ...lista, '', `Pregunta: ${pregunta}`].join('\n') };
}

/** Citas sin repetir, en orden y dentro de 1..total. */
export function citasValidas(citas: number[], total: number): number[] {
  return [...new Set(citas)].filter((c) => Number.isInteger(c) && c >= 1 && c <= total).sort((a, b) => a - b);
}

/** Fuente de cada cita, con los metadatos del fragmento citado (citas de 1 a n). */
export function fuentesCitadas(citas: number[], documentos: { metadata?: Record<string, unknown> }[]) {
  return citas.map((cita) => {
    const metadatos = documentos[cita - 1]?.metadata ?? {};
    return {
      cita,
      seccion: String(metadatos.seccion ?? ''),
      fuente: String(metadatos.fuente ?? ''),
      url: String(metadatos.url ?? ''),
      licencia: String(metadatos.licencia ?? ''),
    };
  });
}

export const PALABRAS_VACIAS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'al', 'un', 'una']);

/**
 * Palabras que identifican el lugar, tal como se buscan en los textos; vacío si no hay lugar que
 * comprobar. Lo que va entre paréntesis suele ser la dirección, que la guía escribe aparte.
 */
export function nombreDeLugar(lugar: string, destino?: string): string[] {
  const nombre = palabras(lugar.replace(/\([^)]*\)/g, ' '));
  // Sin el destino al final: «Alcazaba de Granada» debe encontrar «Alcazaba» en la guía de Granada.
  // Si el lugar es solo el destino, queda vacío: la ciudad no es un lugar que visitar dentro de ella.
  const ciudad = destino ? palabras(destino) : [];
  if (ciudad.length && ciudad.every((p, i) => nombre[nombre.length - ciudad.length + i] === p)) {
    nombre.splice(nombre.length - ciudad.length);
  }
  // Sin los artículos de los extremos: «El Serranito» debe encontrar «serranito».
  while (nombre.length && PALABRAS_VACIAS.has(nombre[0]!)) nombre.shift();
  while (nombre.length && PALABRAS_VACIAS.has(nombre.at(-1)!)) nombre.pop();
  // Sin ninguna palabra con letras («[1]») no hay lugar que comprobar.
  return nombre.some((p) => /\p{L}/u.test(p)) ? nombre : [];
}

/**
 * Comprueba que el lugar recomendado aparece en alguno de los textos que cita, con su nombre
 * seguido. Con las palabras sueltas pasaban descripciones inventadas con palabras del fragmento
 * («Zona de discotecas y música heavy en Marina»), lo que favorecía a los modos con RAG.
 */
export function verificarRecomendacion(lugar: string, textosCitados: string[], destino?: string): boolean {
  const nombre = nombreDeLugar(lugar, destino);
  return nombre.length > 0 && textosCitados.some((texto) => contieneSeguidas(palabras(texto), nombre));
}

function contieneSeguidas(texto: string[], buscadas: string[]): boolean {
  for (let i = 0; i + buscadas.length <= texto.length; i++) {
    if (buscadas.every((p, j) => texto[i + j] === p)) return true;
  }
  return false;
}

export type Verificacion = 'verificada' | 'cita-erronea' | 'sin-fuente';

/**
 * Distingue dos fallos que pesan distinto en la evaluación: citar mal un lugar que sí está en
 * los textos recuperados (cita errónea) o proponer uno que no aparece en ninguno (sin fuente,
 * probablemente inventado). `citas` va de 1 a n sobre `textos`.
 */
export function clasificarActividad(lugar: string, citas: number[], textos: string[], destino?: string): Verificacion {
  const citados = citas.map((c) => textos[c - 1] ?? '');
  if (verificarRecomendacion(lugar, citados, destino)) return 'verificada';
  return verificarRecomendacion(lugar, textos, destino) ? 'cita-erronea' : 'sin-fuente';
}

export function palabras(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
