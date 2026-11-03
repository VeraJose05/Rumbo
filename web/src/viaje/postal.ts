// RF-06, RF-12: lo que enseña la postal de cada lugar del itinerario: si está en la guía (según la
// verificación del planificador) y la línea de la guía de donde sale, con su fuente y licencia.
import type { Actividad, Fuente, Recuperado, Verificacion } from './itinerario';
import { COMPANIAS, RITMOS, type Perfil } from './perfil';

export function etiquetaVerificacion(v: Verificacion): { tipo: 'guia' | 'sin-fuente'; texto: string } | null {
  // «cita-erronea»: el lugar está en la guía, solo que en otro texto de los recuperados.
  if (v === 'verificada' || v === 'cita-erronea') return { tipo: 'guia', texto: 'Está en la guía' };
  if (v === 'sin-fuente') return { tipo: 'sin-fuente', texto: 'Sin fuente en la guía' };
  return null;
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
const palabras = (texto: string) => normalizar(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Palabras del nombre que lo identifican: las de 4 letras o más (o de 3 si no hay ninguna). */
function clave(lugar: string): string[] {
  const todas = palabras(lugar);
  const largas = todas.filter((p) => p.length >= 4);
  return largas.length ? largas : todas.filter((p) => p.length >= 3);
}

/** La línea (fichas «* Nombre - …») o frase del texto que nombra el lugar, o null. */
function lineaQueNombra(texto: string, lugar: string): string | null {
  const buscadas = clave(lugar);
  if (!buscadas.length) return null;
  const trozos = texto.includes('\n') ? texto.split('\n') : texto.split(/(?<=\.)\s+/);
  for (const trozo of trozos) {
    const suyas = palabras(trozo);
    // Cada palabra buscada es el principio de alguna del trozo: «Alcázar» encuentra «Alcázares».
    if (buscadas.every((b) => suyas.some((p) => p.startsWith(b)))) return trozo.replace(/^\s*\*\s*/, '').trim();
  }
  return null;
}

export interface Cita {
  texto: string;
  seccion: string;
  url: string;
  licencia: string;
}

export function citaDeLugar(actividad: Actividad, recuperados: Recuperado[], fuentes: Fuente[]): Cita | null {
  // Primero los textos que cita; si no lo nombran (cita errónea), los demás recuperados.
  const citados = recuperados.filter((r) => actividad.citas.includes(r.cita));
  const resto = recuperados.filter((r) => !actividad.citas.includes(r.cita));
  for (const r of [...citados, ...resto]) {
    const texto = lineaQueNombra(r.texto, actividad.lugar);
    if (!texto) continue;
    const fuente = fuentes.find((f) => f.cita === r.cita) ?? fuentes[0];
    return { texto, seccion: r.seccion, url: fuente?.url ?? '', licencia: fuente?.licencia ?? 'CC BY-SA 4.0' };
  }
  return null;
}

export function resumenViaje(perfil: Perfil): string {
  const compania = COMPANIAS.find((c) => c.id === perfil.compania)!.nombre.toLowerCase();
  const ritmo = RITMOS.find((r) => r.id === perfil.ritmo)!.nombre.toLowerCase();
  return `${perfil.dias} ${perfil.dias === 1 ? 'día' : 'días'} · ${compania} · ritmo ${ritmo}`;
}

/** Recorta una cita larga al final de la última frase que cabe (o por palabras) y marca el corte. */
export function recortarCita(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  const frases = texto.split(/(?<=\.)\s+/);
  let resultado = '';
  for (const frase of frases) {
    const siguiente = resultado ? `${resultado} ${frase}` : frase;
    if (siguiente.length > maximo) break;
    resultado = siguiente;
  }
  if (!resultado) {
    // Ni la primera frase cabe: por palabras.
    for (const palabra of texto.split(/\s+/)) {
      const siguiente = resultado ? `${resultado} ${palabra}` : palabra;
      if (siguiente.length > maximo) break;
      resultado = siguiente;
    }
  }
  return `${resultado} […]`;
}
