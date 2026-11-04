// RF-11, RF-12: un viaje ya planificado (perfil, itinerario y lugares quitados) y su ajuste por
// mensaje («más tranquilo», «quita la Catedral», «añade museos», «un día más»).
import type { Itinerario } from './itinerario';
import type { Perfil } from './perfil';
import { PlanificarError, mensajeDeError } from './planificar';

export interface Viaje {
  perfil: Perfil;
  itinerario: Itinerario;
  /** Lugares quitados en ajustes anteriores: el servidor no los vuelve a poner. */
  quitados: string[];
}

export function peticionAjuste(viaje: Viaje, mensaje: string) {
  const texto = mensaje.trim();
  if (!texto) throw new Error('Mensaje vacío');
  return { data: { perfil: viaje.perfil, itinerario: viaje.itinerario, quitados: viaje.quitados, mensaje: texto } };
}

/** Devuelve el viaje ajustado y la respuesta de Rumbo («He quitado la Catedral…»). */
export async function ajustar(viaje: Viaje, mensaje: string): Promise<{ viaje: Viaje; respuesta: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/ajusteFlow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(peticionAjuste(viaje, mensaje)),
    });
  } catch {
    throw new PlanificarError({ cuota: false, mensaje: 'No hay conexión con el servidor de Rumbo.' });
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !('result' in cuerpo)) throw new PlanificarError(mensajeDeError(respuesta.status, cuerpo));
  const { perfil, itinerario, quitados, respuesta: texto } = cuerpo.result;
  return { viaje: { perfil, itinerario, quitados }, respuesta: texto };
}

/** Qué se está haciendo mientras se ajusta: «Quitando la Catedral» o el mensaje entre comillas. */
export function textoAjustando(mensaje: string): string {
  const texto = mensaje.trim();
  const quitar = /^quita\s+(.+)$/i.exec(texto);
  if (quitar) return `Quitando ${quitar[1]}`;
  return `«${texto.length > 40 ? `${texto.slice(0, 40)}…` : texto}»`;
}
