// RF-04, RF-06: prompt de generación con fragmentos numerados y lectura de las citas.

export interface FragmentoRecuperado {
  texto: string;
  seccion: string;
}

// RNF-05: en español. Modo estricto: solo la información de los textos recuperados.
// El ejemplo (de un destino que no está en el corpus) enseña al modelo el formato de las citas.
const SISTEMA_RAG = `Eres un asistente de viajes. Responde en español usando SOLO la información de los textos que te da el usuario.

Reglas:
1. Después de cada dato, pon entre corchetes el número del texto del que sale, por ejemplo [2]. Si sale de varios, [1][3].
2. Si los textos no responden a la pregunta, di con naturalidad que no tienes esa información, por ejemplo: «No tengo información sobre escape rooms en Sevilla.»
3. No añadas lugares, precios ni horarios que no aparezcan en los textos.
4. Habla directamente al viajero y nunca menciones los textos, fragmentos o referencias que has recibido.

Ejemplo:
Textos:
[1] (Toledo › Ver) La Catedral Primada es de estilo gótico y la entrada cuesta 12 euros.
[2] (Toledo › Comer) El mazapán es el dulce típico de la ciudad.

Pregunta: ¿Qué puedo ver y probar?
Respuesta: Visita la Catedral Primada, de estilo gótico; la entrada cuesta 12 euros [1]. Y no te vayas sin probar el mazapán, el dulce típico de la ciudad [2].`;

export function construirPromptRag(
  pregunta: string,
  destino: string,
  fragmentos: FragmentoRecuperado[],
): { system: string; prompt: string } {
  const lista = fragmentos.map((f, i) => `[${i + 1}] (${destino} › ${f.seccion}) ${f.texto}`);
  return { system: SISTEMA_RAG, prompt: ['Textos:', ...lista, '', `Pregunta: ${pregunta}`].join('\n') };
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
