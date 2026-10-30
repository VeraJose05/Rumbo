// F5 (RNF-03): métricas deterministas sobre un itinerario ya generado. Las que necesitan
// juicio (relevancia, viabilidad) las pone un LLM como juez aparte.
import { actividadesPorDia, totalActividades } from '../flows/itinerario.js';
import type { Perfil } from '../flows/perfil.js';
import type { Itinerario } from '../flows/planificacion.js';
import { clasificarActividad, nombreDeLugar, PALABRAS_VACIAS, palabras, verificarRecomendacion } from '../flows/rag.js';

/** Si el lugar aparece en la guía del destino: su nombre seguido en algún fragmento (cota baja). */
export function enCorpus(lugar: string, corpusDestino: string[], destino?: string): boolean {
  return verificarRecomendacion(lugar, corpusDestino, destino);
}

/**
 * Regla laxa (cota alta): las palabras significativas del lugar están en un mismo fragmento,
 * en cualquier orden. Acepta nombres reales escritos distinto, pero también descripciones
 * inventadas con palabras del fragmento. Ninguna de las dos reglas es neutral entre modos,
 * así que la fidelidad se da como intervalo entre ambas.
 */
export function enCorpusLaxo(lugar: string, corpusDestino: string[], destino?: string): boolean {
  const buscadas = nombreDeLugar(lugar, destino).filter((p) => !PALABRAS_VACIAS.has(p));
  return (
    buscadas.length > 0 &&
    corpusDestino.some((texto) => {
      const presentes = new Set(palabras(texto));
      return buscadas.every((p) => presentes.has(p));
    })
  );
}

/**
 * Vuelve a verificar cada actividad con la regla actual y los fragmentos guardados en el propio
 * itinerario: si cambia la regla, se recalcula sin volver a llamar al modelo. En C0, sin fuentes.
 */
export function reverificar(itinerario: Itinerario, destino: string): Itinerario {
  const textos = [...itinerario.recuperados].sort((a, b) => a.cita - b.cita).map((r) => r.texto);
  const verificar = (franja: Itinerario['dias'][number]['manana']) =>
    franja.map((a) => ({ ...a, verificacion: itinerario.modo === 'C0' ? null : clasificarActividad(a.lugar, a.citas, textos, destino) }));
  return { ...itinerario, dias: itinerario.dias.map((d) => ({ ...d, manana: verificar(d.manana), tarde: verificar(d.tarde), noche: verificar(d.noche) })) };
}

export interface MetricasItinerario {
  /** false si el sistema dijo que no tenía información (RF-07). */
  planificado: boolean;
  actividades: number;
  /** Actividades cuyo lugar está en la guía del destino, con el nombre seguido. Igual para todos los modos: mide H1. */
  fidelidad: number | null;
  /** Igual, con la regla de palabras sueltas: cota alta de la fidelidad. */
  fidelidadLaxa: number | null;
  /** Actividades cuyo lugar está en el texto que citan; null en C0, que no cita. */
  coberturaCitas: number | null;
  /** Días pedidos con exactamente las actividades que marca el ritmo. */
  ritmoCumplido: number | null;
}

const proporcion = (parte: number, total: number) => (total ? parte / total : null);

export function metricasItinerario(itinerario: Itinerario, perfil: Perfil, corpusDestino: string[]): MetricasItinerario {
  // Siempre con la verificación actual, no con la que se grabó al generar.
  const actividades = reverificar(itinerario, perfil.destino).dias.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche]);
  if (!itinerario.hayInformacion) {
    return { planificado: false, actividades: 0, fidelidad: null, fidelidadLaxa: null, coberturaCitas: null, ritmoCumplido: null };
  }

  const enGuia = actividades.filter((a) => enCorpus(a.lugar, corpusDestino, perfil.destino)).length;
  const enGuiaLaxo = actividades.filter((a) => enCorpusLaxo(a.lugar, corpusDestino, perfil.destino)).length;
  const verificadas = actividades.filter((a) => a.verificacion === 'verificada').length;
  const diasCompletos = itinerario.dias.filter((d) => totalActividades(d) === actividadesPorDia(perfil.ritmo)).length;

  return {
    planificado: true,
    actividades: actividades.length,
    fidelidad: proporcion(enGuia, actividades.length),
    fidelidadLaxa: proporcion(enGuiaLaxo, actividades.length),
    coberturaCitas: itinerario.modo === 'C0' ? null : proporcion(verificadas, actividades.length),
    // Sobre los días pedidos, no los generados: un día que falta cuenta como no cumplido.
    ritmoCumplido: proporcion(diasCompletos, perfil.dias),
  };
}
