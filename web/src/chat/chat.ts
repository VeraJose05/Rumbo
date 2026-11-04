// RF-02, RF-04, RF-12: chat con Rumbo. La entrevista (entrevistaFlow) completa el perfil
// conversando y contesta preguntas con la guía; el servidor no guarda estado: la web lo envía.
import type { Perfil } from '../viaje/perfil';
import { PlanificarError, mensajeDeError } from '../viaje/planificar';

export type Trozo = { tipo: 'texto'; texto: string } | { tipo: 'enlace'; texto: string; url: string };

// [texto](url), solo http(s). La URL admite paréntesis equilibrados, como en «Granada_(España)».
const ENLACE_MARKDOWN = /\[([^\]]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g;

/** Texto de Rumbo en trozos de texto y enlaces, para pintarlo con React (que escapa el texto). */
export function trozosDeTexto(texto: string): Trozo[] {
  const trozos: Trozo[] = [];
  let desde = 0;
  for (const m of texto.matchAll(ENLACE_MARKDOWN)) {
    if (m.index > desde) trozos.push({ tipo: 'texto', texto: texto.slice(desde, m.index) });
    trozos.push({ tipo: 'enlace', texto: m[1]!, url: m[2]! });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) trozos.push({ tipo: 'texto', texto: texto.slice(desde) });
  return trozos;
}

/** Estado de la entrevista tal como lo devuelve el servidor; la web solo lo guarda y lo reenvía. */
export type EstadoEntrevista = Record<string, unknown>;

export function peticionEntrevista(estado: EstadoEntrevista | null, mensaje: string) {
  return { data: estado ? { estado, mensaje: mensaje.trim() } : { mensaje: mensaje.trim() } };
}

export interface Turno {
  estado: EstadoEntrevista;
  respuesta: string;
  /** El perfil completo cuando la entrevista termina; null mientras tanto. */
  perfil: Perfil | null;
}

export async function hablar(estado: EstadoEntrevista | null, mensaje: string): Promise<Turno> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/entrevistaFlow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(peticionEntrevista(estado, mensaje)),
    });
  } catch {
    throw new PlanificarError({ cuota: false, mensaje: 'No hay conexión con el servidor de Rumbo.' });
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !('result' in cuerpo)) throw new PlanificarError(mensajeDeError(respuesta.status, cuerpo));
  return cuerpo.result as Turno;
}
