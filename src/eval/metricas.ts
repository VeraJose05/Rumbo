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

/**
 * Vuelve a verificar cada actividad con la regla actual y los fragmentos guardados en el propio
 * itinerario: si cambia la regla, se recalcula sin volver a llamar al modelo. En C0, sin fuentes.
 */
export function reverificar(itinerario: Itinerario): Itinerario {
  const textos = [...itinerario.recuperados].sort((a, b) => a.cita - b.cita).map((r) => r.texto);
  const verificar = (franja: Itinerario['dias'][number]['manana']) =>
    franja.map((a) => ({ ...a, verificacion: itinerario.modo === 'C0' ? null : clasificarActividad(a.lugar, a.citas, textos) }));
  return { ...itinerario, dias: itinerario.dias.map((d) => ({ ...d, manana: verificar(d.manana), tarde: verificar(d.tarde), noche: verificar(d.noche) })) };
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
  // Siempre con la verificación actual, no con la que se grabó al generar.
  const actividades = reverificar(itinerario).dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche]);
  if (!itinerario.hayInformacion) {
    return { planificado: false, actividades: 0, fidelidad: null, coberturaCitas: null, ritmoCumplido: null };
  }

  const enGuia = actividades.filter((a) => enCorpus(a.lugar, corpusDestino)).length;
  const verificadas = actividades.filter((a) => a.verificacion === 'verificada').length;
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
