// RF-05, RF-06, RF-07, RF-09: flow de planificación. Del perfil al itinerario día a día,
// en el modo indicado: C0 sin recuperación, C1 con RAG básico.
import { z, type Document, type Genkit, type RetrieverArgument } from 'genkit';
import { consultasDelPerfil, fusionarResultados } from './consultas.js';
import { DiaSchema, esquemaDiaModelo, lugaresUsados, type Dia } from './itinerario.js';
import { PerfilSchema } from './perfil.js';
import { FuenteSchema, type OpcionesRecuperacionSchema } from './pregunta.js';
import { construirPromptDia } from './prompt-dia.js';
import { citasValidas, fuentesCitadas, verificarRecomendacion } from './rag.js';

export const MODOS = ['C0', 'C1'] as const;

/** Fragmentos que se recuperan en total, repartidos entre las consultas del perfil. */
export const TOTAL_FRAGMENTOS = 12;

const ActividadFinalSchema = z.object({
  lugar: z.string(),
  descripcion: z.string(),
  citas: z.array(z.number()),
  /** El lugar aparece en los textos que cita; null en C0, que no tiene fuentes. */
  verificada: z.boolean().nullable(),
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

export const ItinerarioSchema = z.object({
  modo: z.enum(MODOS),
  /** false si no hay fragmentos del destino: no se planifica en vez de inventar (RF-07). */
  hayInformacion: z.boolean(),
  dias: z.array(DiaFinalSchema),
  fuentes: z.array(FuenteSchema),
});

export type Itinerario = z.infer<typeof ItinerarioSchema>;

export function definirPlanificacionFlow(ai: Genkit, recuperador: RetrieverArgument<typeof OpcionesRecuperacionSchema>) {
  return ai.defineFlow(
    { name: 'planificacionFlow', inputSchema: PlanificacionEntradaSchema, outputSchema: ItinerarioSchema },
    async ({ perfil, modo }) => {
      // 1. Recuperación (solo C1): una consulta por interés, fusionadas por turnos.
      let documentos: Document[] | null = null;
      if (modo === 'C1') {
        const consultas = consultasDelPerfil(perfil);
        const k = Math.ceil(TOTAL_FRAGMENTOS / consultas.length);
        const listas = [];
        for (const consulta of consultas) {
          const encontrados = await ai.retrieve({
            retriever: recuperador,
            query: consulta.texto,
            options: { k, destino: perfil.destino },
          });
          listas.push(encontrados.map((d) => Object.assign(d, { id: String(d.metadata?.id ?? '') })));
        }
        documentos = fusionarResultados(listas, TOTAL_FRAGMENTOS);
        if (!documentos.length) return { modo, hayInformacion: false, dias: [], fuentes: [] };
      }
      const fragmentos = documentos?.map((d) => ({ texto: d.text, seccion: String(d.metadata?.seccion ?? '') })) ?? null;

      // 2. Generación: un día por llamada, con los lugares ya usados para no repetir.
      const dias: Dia[] = [];
      for (let numero = 1; numero <= perfil.dias; numero++) {
        const { system, prompt } = construirPromptDia({ perfil, dia: numero, usados: lugaresUsados(dias), fragmentos });
        const { output } = await ai.generate({
          system,
          prompt,
          output: { schema: esquemaDiaModelo({ conCitas: documentos !== null }) },
          // Temperatura 0 para que los experimentos sean repetibles (RNF-03).
          config: { temperature: 0 },
        });
        if (!output) throw new Error(`El modelo no devolvió el día ${numero} con el esquema esperado`);
        const conCitas = (franja: { lugar: string; descripcion: string; citas?: number[] }[]) =>
          franja.map((a) => ({ lugar: a.lugar, descripcion: a.descripcion, citas: a.citas ?? [] }));
        dias.push({ dia: numero, manana: conCitas(output.manana), tarde: conCitas(output.tarde), noche: conCitas(output.noche) });
      }

      // 3. Verificación de cada actividad contra los textos que cita.
      const verificar = (franja: Dia['manana']) =>
        franja.map((a) => {
          if (!documentos) return { ...a, citas: [], verificada: null };
          const citas = citasValidas(a.citas, documentos.length);
          const textos = citas.map((c) => documentos[c - 1]!.text);
          return { ...a, citas, verificada: verificarRecomendacion(a.lugar, textos) };
        });
      const diasFinales = dias.map((d) => ({ ...d, manana: verificar(d.manana), tarde: verificar(d.tarde), noche: verificar(d.noche) }));

      const citadas = documentos
        ? citasValidas(diasFinales.flatMap((d) => [...d.manana, ...d.tarde, ...d.noche].flatMap((a) => a.citas)), documentos.length)
        : [];
      return { modo, hayInformacion: true, dias: diasFinales, fuentes: documentos ? fuentesCitadas(citadas, documentos) : [] };
    },
  );
}
