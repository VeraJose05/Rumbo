// RF-05, RF-06, RF-07, RF-09: flow de planificación. Del perfil al itinerario día a día,
// en el modo indicado: C0 sin recuperación, C1 con RAG básico y C2 con RAG avanzado
// (búsqueda híbrida y reranking). C1 y C2 solo se diferencian en el recuperador.
import { z, type Document, type Genkit, type RetrieverArgument } from 'genkit';
import { sinCobertura } from '../config/cobertura.js';
import { consultasDelPerfil, fusionarResultados } from './consultas.js';
import {
  actividadesPorDia,
  DiaSchema,
  esquemaDiaModelo,
  lugaresUsados,
  repartirEnFranjas,
  totalActividades,
  type Dia,
} from './itinerario.js';
import { PerfilSchema, type Perfil } from './perfil.js';
import { FuenteSchema, type OpcionesRecuperacionSchema } from './pregunta.js';
import { construirPromptDia } from './prompt-dia.js';
import { citasValidas, clasificarActividad, fuentesCitadas } from './rag.js';

export const MODOS = ['C0', 'C1', 'C2'] as const;

/** Fragmentos que se recuperan en total, repartidos entre las consultas del perfil. */
export const TOTAL_FRAGMENTOS = 12;

/** Veces que se vuelve a pedir un día si, al quitar repetidos, le faltan actividades. */
const REINTENTOS = 2;

const ActividadFinalSchema = z.object({
  lugar: z.string(),
  descripcion: z.string(),
  citas: z.array(z.number()),
  /** Si el lugar está en los textos que cita, en otro texto recuperado o en ninguno; null en C0. */
  verificacion: z.enum(['verificada', 'cita-erronea', 'sin-fuente']).nullable(),
});

const DiaFinalSchema = DiaSchema.extend({
  manana: z.array(ActividadFinalSchema),
  tarde: z.array(ActividadFinalSchema),
  noche: z.array(ActividadFinalSchema),
});

export const PlanificacionEntradaSchema = z.object({
  perfil: PerfilSchema,
  modo: z.enum(MODOS),
});

/** Fragmento entregado al modelo, con el número con el que se cita en el prompt. */
const RecuperadoSchema = z.object({
  cita: z.number().int(),
  id: z.string(),
  seccion: z.string(),
  texto: z.string(),
  distancia: z.number().optional(),
  /** Nota del reranker (solo C2). */
  puntuacionReranker: z.number().optional(),
});

export const ItinerarioSchema = z.object({
  modo: z.enum(MODOS),
  /** false si no hay fragmentos del destino: no se planifica en vez de inventar (RF-07). */
  hayInformacion: z.boolean(),
  dias: z.array(DiaFinalSchema),
  fuentes: z.array(FuenteSchema),
  /** Intereses que la guía no cubre (RF-07): no se buscan ni se piden al modelo; vacío en C0. */
  // Opcional: los registros de la evaluación anteriores a RF-07 no lo tienen.
  interesesSinCobertura: z.array(z.string()).optional(),
  /** Todo lo recuperado, citado o no, para registrar cada ejecución (RNF-04); vacío en C0. */
  recuperados: z.array(RecuperadoSchema),
});

export type Itinerario = z.infer<typeof ItinerarioSchema>;

export type Recuperador = RetrieverArgument<typeof OpcionesRecuperacionSchema>;

export function definirPlanificacionFlow(
  ai: Genkit,
  recuperador: Recuperador,
  recuperadorAvanzado?: Recuperador,
  calcularSinCobertura: (destino: string, intereses: string[]) => string[] = sinCobertura,
  /** RF-14: si el lugar se puede situar en el mapa; los que no, se cambian por otros (C1 y C2). */
  localizable?: (lugar: string, destino: string) => boolean,
) {
  return ai.defineFlow(
    { name: 'planificacionFlow', inputSchema: PlanificacionEntradaSchema, outputSchema: ItinerarioSchema },
    async ({ perfil: perfilViajero, modo }) => {
      // 0. RF-07: con la guía (C1, C2), los intereses que no cubre no se buscan ni se piden al modelo:
      // si no, rellenaba «playa en Sevilla» con bares. Sin ninguno cubierto, planifica lo imprescindible.
      const interesesSinCobertura = modo === 'C0' ? [] : calcularSinCobertura(perfilViajero.destino, perfilViajero.intereses);
      const perfil = { ...perfilViajero, intereses: perfilViajero.intereses.filter((i) => !interesesSinCobertura.includes(i)) };

      // 1. Recuperación (C1 y C2): una consulta por interés, fusionadas por turnos.
      let documentos: Document[] | null = null;
      if (modo !== 'C0') {
        const elegido = modo === 'C2' ? recuperadorAvanzado : recuperador;
        if (!elegido) throw new Error('El modo C2 necesita el recuperador avanzado');
        documentos = await recuperar(ai, elegido, perfil.destino, consultasDelPerfil(perfil).map((c) => c.texto));
        if (!documentos.length) return { modo, hayInformacion: false, dias: [], fuentes: [], interesesSinCobertura, recuperados: [] };
      }

      // 2. Generación: un día por llamada, con los lugares ya usados para no repetir.
      const dias: Dia[] = [];
      for (let numero = 1; numero <= perfil.dias; numero++) {
        dias.push(await generarDia(ai, { perfil, numero, usados: lugaresUsados(dias), documentos, localizable: soloConGuia(documentos, perfil.destino, localizable) }));
      }

      // 3. Verificación de cada actividad contra los textos que cita.
      return montarItinerario({ modo, destino: perfil.destino, dias, documentos, interesesSinCobertura });
    },
  );
}

/** Documento recuperado: el texto y sus metadatos (sección, fuente, URL, licencia…). */
export type Recuperado = { text: string; metadata?: Record<string, unknown> };

/**
 * Una búsqueda por consulta, fusionadas por turnos hasta TOTAL_FRAGMENTOS. Se pide el doble de la
 * parte de cada consulta: comparten fragmentos y, al quitar repetidos, con la parte justa quedaban
 * 8 en vez de 12.
 */
export async function recuperar(ai: Genkit, recuperador: Recuperador, destino: string, consultas: string[]): Promise<Document[]> {
  const k = 2 * Math.ceil(TOTAL_FRAGMENTOS / consultas.length);
  const listas = [];
  for (const consulta of consultas) {
    const encontrados = await ai.retrieve({ retriever: recuperador, query: consulta, options: { k, destino } });
    listas.push(encontrados.map((d) => Object.assign(d, { id: String(d.metadata?.id ?? '') })));
  }
  return fusionarResultados(listas, TOTAL_FRAGMENTOS);
}

/** El filtro de lugares situables solo se aplica con la guía (C1, C2): C0 queda como línea base. */
export function soloConGuia(documentos: Recuperado[] | null, destino: string, localizable?: (lugar: string, destino: string) => boolean) {
  return documentos && localizable ? (lugar: string) => localizable(lugar, destino) : undefined;
}

/** Genera un día con el modelo; null en documentos es C0 (sin textos ni citas). */
export async function generarDia(
  ai: Genkit,
  {
    perfil,
    numero,
    usados,
    documentos,
    localizable,
  }: { perfil: Perfil; numero: number; usados: string[]; documentos: Recuperado[] | null; localizable?: (lugar: string) => boolean },
): Promise<Dia> {
  const fragmentos = documentos?.map((d) => ({ texto: d.text, seccion: String(d.metadata?.seccion ?? '') })) ?? null;
  const actividades = actividadesPorDia(perfil.ritmo);
  const esquema = esquemaDiaModelo({ conCitas: documentos !== null, actividades });
  const candidatas: z.infer<typeof esquema>['actividades'] = [];
  let dia = repartirEnFranjas(numero, [], usados);
  // Los repetidos se quitan en código («no repitas» en el prompt no bastaba), y también (RF-14) los
  // lugares que no se pueden situar en el mapa: locales cerrados, cosas que no son un sitio
  // («Bares de Nervión») o nombres mal escritos. Si faltan actividades, se reintenta con todo lo
  // propuesto en la lista de lugares a evitar.
  const situable = (a: { lugar: string }) => !localizable || localizable(a.lugar);
  for (let intento = 0; intento <= REINTENTOS && totalActividades(dia) < actividades; intento++) {
    const evitar = [...new Set([...usados, ...candidatas.map((a) => a.lugar)])];
    const { system, prompt } = construirPromptDia({ perfil, dia: numero, usados: evitar, fragmentos });
    const { output } = await ai.generate({
      system,
      prompt,
      output: { schema: esquema },
      // Temperatura 0 para que los experimentos sean repetibles (RNF-03). En los reintentos se sube,
      // con semilla fija: a temperatura 0 el modelo volvía a proponer exactamente los mismos lugares.
      config: intento === 0 ? { temperature: 0 } : { temperature: 0.8, seed: intento },
    });
    if (!output) throw new Error(`El modelo no devolvió el día ${numero} con el esquema esperado`);
    candidatas.push(...output.actividades);
    dia = repartirEnFranjas(numero, candidatas.filter(situable), usados, actividades);
  }
  // Sin sustituto tras los reintentos, mejor un lugar sin chincheta (tiene «Cómo llegar») que un día corto.
  if (totalActividades(dia) < actividades) {
    dia = repartirEnFranjas(numero, [...candidatas.filter(situable), ...candidatas.filter((a) => !situable(a))], usados, actividades);
  }
  return dia;
}

/** Verifica cada actividad contra los textos que cita y monta el itinerario con sus fuentes. */
export function montarItinerario({
  modo,
  destino,
  dias,
  documentos,
  interesesSinCobertura,
}: {
  modo: Itinerario['modo'];
  destino: string;
  dias: Dia[];
  documentos: Recuperado[] | null;
  interesesSinCobertura: string[];
}): Itinerario {
  const textos = documentos?.map((d) => d.text) ?? [];
  const verificar = (franja: Dia['manana']) =>
    franja.map((a) => {
      if (!documentos) return { lugar: a.lugar, descripcion: a.descripcion, citas: [], verificacion: null };
      const citas = citasValidas(a.citas, documentos.length);
      return { lugar: a.lugar, descripcion: a.descripcion, citas, verificacion: clasificarActividad(a.lugar, citas, textos, destino) };
    });
  const diasFinales = dias.map((d) => ({ dia: d.dia, manana: verificar(d.manana), tarde: verificar(d.tarde), noche: verificar(d.noche) }));

  const citadas = documentos
    ? citasValidas(diasFinales.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche].flatMap((a) => a.citas)), documentos.length)
    : [];
  const recuperados = (documentos ?? []).map((d, i) => ({
    cita: i + 1,
    id: String(d.metadata?.id ?? ''),
    seccion: String(d.metadata?.seccion ?? ''),
    texto: d.text,
    distancia: typeof d.metadata?.distancia === 'number' ? d.metadata.distancia : undefined,
    puntuacionReranker: typeof d.metadata?.puntuacionReranker === 'number' ? d.metadata.puntuacionReranker : undefined,
  }));
  return {
    modo,
    hayInformacion: true,
    dias: diasFinales,
    fuentes: documentos ? fuentesCitadas(citadas, documentos) : [],
    interesesSinCobertura,
    recuperados,
  };
}
