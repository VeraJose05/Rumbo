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

const PALABRAS_VACIAS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'al', 'un', 'una']);

/**
 * Comprueba que el lugar recomendado aparece en los textos que cita: todas sus palabras
 * significativas deben estar en ellos. Detecta citas puestas al azar por el modelo.
 */
export function verificarRecomendacion(lugar: string, textosCitados: string[]): boolean {
  const palabrasTextos = new Set(palabras(textosCitados.join(' ')));
  const palabrasLugar = palabras(lugar).filter((p) => !PALABRAS_VACIAS.has(p));
  return palabrasLugar.length > 0 && palabrasLugar.every((p) => palabrasTextos.has(p));
}

function palabras(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
