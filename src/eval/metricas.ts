// F5 (RNF-03): métricas deterministas sobre un itinerario ya generado. Las que necesitan
// juicio (relevancia, viabilidad) las pone un LLM como juez aparte.
import { actividadesPorDia, totalActividades } from '../flows/itinerario.js';
import type { Perfil } from '../flows/perfil.js';
import type { Itinerario } from '../flows/planificacion.js';
import { clasificarActividad, verificarRecomendacion } from '../flows/rag.js';

/** Si el lugar aparece en la guía del destino: su nombre seguido en algún fragmento. */
export function enCorpus(lugar: string, corpusDestino: string[]): boolean {
  return verificarRecomendacion(lugar, corpusDestino);
}

export interface MetricasItinerario {
  /** false si el sistema dijo que no tenía información (RF-07). */
  planificado: boolean;
  actividades: number;
  /** Actividades cuyo lugar está en la guía del destino. Igual para todos los modos: mide H1. */
  fidelidad: number | null;
  /** Actividades cuyo lugar está en el texto que citan; null en C0, que no cita. */
  coberturaCitas: number | null;
  /** Días pedidos con exactamente las actividades que marca el ritmo. */
  ritmoCumplido: number | null;
}

const proporcion = (parte: number, total: number) => (total ? parte / total : null);

export function metricasItinerario(itinerario: Itinerario, perfil: Perfil, corpusDestino: string[]): MetricasItinerario {
  const actividades = itinerario.dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche]);
  if (!itinerario.hayInformacion) {
    return { planificado: false, actividades: 0, fidelidad: null, coberturaCitas: null, ritmoCumplido: null };
  }

  const enGuia = actividades.filter((a) => enCorpus(a.lugar, corpusDestino)).length;
  // Se vuelve a verificar con los fragmentos guardados en vez de usar la verificación grabada al
  // generar: así, si cambia la regla, las métricas se recalculan sin volver a llamar al modelo.
  const textos = [...itinerario.recuperados].sort((a, b) => a.cita - b.cita).map((r) => r.texto);
  const verificadas = actividades.filter((a) => clasificarActividad(a.lugar, a.citas, textos) === 'verificada').length;
  const diasCompletos = itinerario.dias.filter((d) => totalActividades(d) === actividadesPorDia(perfil.ritmo)).length;

  return {
    planificado: true,
    actividades: actividades.length,
    fidelidad: proporcion(enGuia, actividades.length),
    coberturaCitas: itinerario.modo === 'C0' ? null : proporcion(verificadas, actividades.length),
    // Sobre los días pedidos, no los generados: un día que falta cuenta como no cumplido.
    ritmoCumplido: proporcion(diasCompletos, perfil.dias),
  };
}
