// RF-04, RF-06: prompt de generación con fragmentos numerados y lectura de las citas.

export interface FragmentoRecuperado {
  texto: string;
  seccion: string;
}

// RNF-05: en español. Modo estricto: solo la información de los fragmentos.
const SISTEMA_RAG = `Eres un asistente de viajes. Responde en español usando SOLO la información de los fragmentos que te da el usuario.

Reglas:
1. Cada dato que des debe ir seguido de la cita del fragmento del que sale, por ejemplo [2].
2. Si los fragmentos no contienen la respuesta, dilo claramente en lugar de inventar.
3. No añadas lugares, precios ni horarios que no aparezcan en los fragmentos.`;

export function construirPromptRag(
  pregunta: string,
  destino: string,
  fragmentos: FragmentoRecuperado[],
): { system: string; prompt: string } {
  const lista = fragmentos.map((f, i) => `[${i + 1}] (${destino} › ${f.seccion}) ${f.texto}`);
  return { system: SISTEMA_RAG, prompt: ['Fragmentos:', ...lista, '', `Pregunta: ${pregunta}`].join('\n') };
}

/** Números de fragmento citados en la respuesta, sin repetir, en orden y dentro de 1..total. */
export function extraerCitas(respuesta: string, total: number): number[] {
  const citas = new Set<number>();
  for (const [, grupo = ''] of respuesta.matchAll(/\[([\d,\s]+)\]/g)) {
    for (const numero of grupo.split(',').map(Number)) {
      if (Number.isInteger(numero) && numero >= 1 && numero <= total) citas.add(numero);
    }
  }
  return [...citas].sort((a, b) => a - b);
}
