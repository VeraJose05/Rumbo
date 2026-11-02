// RF-01: guardarraíl para los mensajes que redacta el modelo en la entrevista. Si un mensaje no
// pasa la validación, la entrevista usa el texto fijo de reserva. En las pruebas, sin esta
// comprobación, el modelo proponía destinos («¿Te apuntas a un viaje al Caribe?») y lugares inventados.
import { normalizar } from '../config/destinos.js';

// Tres frases cortas, como pide el prompt de la entrevista (con 240 se descartaban mensajes correctos).
const LONGITUD_MAXIMA = 320;

// Palabras con las que el modelo suele empezar una frase seguida de coma («Vale, ¿y cuántos días?»).
// Sin tildes, porque se comparan normalizadas.
const INTERJECCIONES = new Set([
  'hola', 'vale', 'genial', 'perfecto', 'claro', 'bien', 'muy', 'bueno', 'estupendo',
  'fenomenal', 'entendido', 'ah', 'oh', 'vaya', 'pues', 'asi', 'entonces', 'gracias',
]);

export type Validacion = { valido: true } | { valido: false; motivo: string };

/**
 * Comprueba que el mensaje sea breve y no mencione nombres propios nuevos:
 * toda palabra en mayúscula que no empiece frase debe aparecer en los textos permitidos
 * (mensaje del viajero, catálogo de destinos…). Las de principio de frase no se distinguen de un
 * nombre propio, así que solo se comprueban si van seguidas de coma, como en un vocativo
 * («Eduardo, un par de días es genial»), y no son una interjección habitual.
 */
export function validarMensaje(texto: string, permitidos: string[]): Validacion {
  const limpio = texto.trim();
  if (!limpio) return { valido: false, motivo: 'vacío' };
  if (limpio.length > LONGITUD_MAXIMA) return { valido: false, motivo: 'demasiado largo' };

  const palabrasPermitidas = new Set(permitidos.flatMap((p) => palabras(p)).map(normalizar));
  const esNueva = (p: string) => /^\p{Lu}/u.test(p) && !palabrasPermitidas.has(normalizar(p));
  for (const frase of limpio.split(/[.!?¡¿]+/)) {
    const [primera, ...resto] = palabras(frase);
    const vocativo = primera && new RegExp(`^\\s*${primera},`).test(frase) && !INTERJECCIONES.has(normalizar(primera));
    const nueva = vocativo && esNueva(primera) ? primera : resto.find(esNueva);
    if (nueva) return { valido: false, motivo: `nombre no permitido: ${nueva}` };
  }
  return { valido: true };
}

function palabras(texto: string): string[] {
  return texto.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Quita el saludo con que empieza un mensaje: el modelo saludaba en mitad de la entrevista
 * («Hola, ¿te gustaría…?») aunque el prompt le dice que salude solo al inicio.
 */
export function quitarSaludo(texto: string): string {
  const sin = texto.replace(/^\s*¡?\s*(hola|buenas)\b[^.!?¿]*?([.!,]\s*|\s+(?=¿))/i, '').replace(/^\s*(buenas)[.!,]?\s*/i, '');
  if (sin === texto) return texto;
  // Mayúscula en la primera letra, también tras «¿» o «¡».
  return sin.replace(/^([¿¡]?)(\p{L})/u, (_, signo: string, letra: string) => signo + letra.toUpperCase());
}

/**
 * Quita las frases que preguntan algo. En la pregunta de opcionales pregunta el código, con las
 * opciones; si el modelo también preguntaba, las dos preguntas se solapaban.
 */
export function quitarPreguntas(texto: string): string {
  const frases = texto.match(/[^.!?]+[.!?]*/g) ?? [];
  return frases
    .map((f) => f.trim())
    .filter((f) => f && !f.includes('?') && !f.includes('¿'))
    .join(' ');
}
