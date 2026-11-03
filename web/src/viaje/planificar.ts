// RF-05, RF-12: llamada al planificador. La web planifica con C1 (RAG básico): en la evaluación,
// C2 no mejoraba los resultados y tardaba 2,5 veces más.
import type { Itinerario } from './itinerario';
import type { Perfil } from './perfil';

export function peticionPlanificar(perfil: Perfil) {
  if (!perfil.destino) throw new Error('Falta el destino');
  if (!perfil.intereses.length) throw new Error('Falta al menos un gusto');
  return { data: { perfil, modo: 'C1' as const } };
}

export interface ErrorPlanificar {
  cuota: boolean;
  mensaje: string;
}

/** Con 429 (cuota gratuita del LLM agotada, RNF-10) el servidor manda un mensaje para el viajero. */
export function mensajeDeError(estado: number, cuerpo: { message?: string; status?: string }): ErrorPlanificar {
  if (estado === 429) return { cuota: true, mensaje: cuerpo.message ?? 'Se ha agotado la cuota gratuita del modelo.' };
  return { cuota: false, mensaje: `El planificador ha fallado (error ${estado}).` };
}

export class PlanificarError extends Error {
  constructor(readonly detalle: ErrorPlanificar) {
    super(detalle.mensaje);
  }
}

export async function planificar(perfil: Perfil, signal?: AbortSignal): Promise<Itinerario> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/planificacionFlow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(peticionPlanificar(perfil)),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new PlanificarError({ cuota: false, mensaje: 'No hay conexión con el servidor de Rumbo.' });
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !('result' in cuerpo)) throw new PlanificarError(mensajeDeError(respuesta.status, cuerpo));
  return cuerpo.result as Itinerario;
}
