// RF-11: ajuste del itinerario por chat («más tranquilo», «quita la Catedral», «añade museos»,
// «un día más»). La petición la interpreta el código (ajuste-logica) y solo se rehacen los días
// afectados, con los mismos fragmentos: así las citas de los días que no cambian siguen valiendo.
import type { Punto } from '../compartido/ubicar.js';
import { z, type Genkit } from 'genkit';
import { sinCobertura } from '../config/cobertura.js';
import { diasAfectados, interpretarAjuste, type Cambio } from './ajuste-logica.js';
import { consultasDelPerfil } from './consultas.js';
import { ETIQUETAS_INTERES } from './entrevista-logica.js';
import { lugaresUsados, type Dia } from './itinerario.js';
import { PerfilSchema, type INTERESES, type Perfil } from './perfil.js';
import {
  generarDia,
  soloConGuia,
  ItinerarioSchema,
  montarItinerario,
  recuperar,
  type Itinerario,
  type Recuperado,
  type Recuperador,
} from './planificacion.js';

export const AjusteEntradaSchema = z.object({
  perfil: PerfilSchema,
  itinerario: ItinerarioSchema,
  mensaje: z.string(),
  /** Lugares quitados en ajustes anteriores: no vuelven aunque se rehagan todos los días. */
  quitados: z.array(z.string()).optional(),
});
export const AjusteSalidaSchema = z.object({
  perfil: PerfilSchema,
  itinerario: ItinerarioSchema,
  respuesta: z.string(),
  quitados: z.array(z.string()),
});

const NO_ENTENDIDO =
  'No he entendido qué quieres cambiar. Puedes pedirme, por ejemplo, «más tranquilo», «quita la Catedral», «añade museos» o «un día más».';

const etiquetas = (intereses: string[]) => intereses.map((i) => ETIQUETAS_INTERES[i as (typeof INTERESES)[number]] ?? i);
const lista = (cosas: (string | number)[]) => (cosas.length > 1 ? `${cosas.slice(0, -1).join(', ')} y ${cosas.at(-1)}` : String(cosas[0]));
const actividades = (d: Dia) => [...d.manana, ...d.tarde, ...d.noche];

export function definirAjusteFlow(
  ai: Genkit,
  recuperador: Recuperador,
  recuperadorAvanzado?: Recuperador,
  calcularSinCobertura: (destino: string, intereses: string[]) => string[] = sinCobertura,
  /** RF-14: los días rehechos tampoco llevan lugares que no se puedan situar ni repiten sitio. */
  situar?: (lugar: string, destino: string) => Punto | null,
) {
  return ai.defineFlow(
    { name: 'ajusteFlow', inputSchema: AjusteEntradaSchema, outputSchema: AjusteSalidaSchema },
    async ({ perfil, itinerario, mensaje, quitados: quitadosAntes = [] }) => {
      const conGuia = itinerario.modo !== 'C0';
      const lugares = itinerario.dias.flatMap((d) => actividades(d).map((a) => a.lugar));
      const avisos: string[] = [];

      // 1. Qué se pide. Un interés que la guía no cubre no se añade (RF-07): se avisa.
      const cambios: Cambio[] = interpretarAjuste(mensaje, perfil, lugares).flatMap((c) => {
        if (c.tipo !== 'anadir-intereses' || !conGuia) return [c];
        const sin = calcularSinCobertura(perfil.destino, c.intereses);
        if (sin.length) avisos.push(`La guía de ${perfil.destino} no habla de ${etiquetas(sin).join(' ni de ')}, así que no puedo añadirlo.`);
        const resto = c.intereses.filter((i) => !sin.includes(i));
        return resto.length ? [{ ...c, intereses: resto }] : [];
      });
      if (!cambios.length) return { perfil, itinerario, quitados: quitadosAntes, respuesta: avisos.length ? avisos.join(' ') : NO_ENTENDIDO };

      // 2. El perfil nuevo.
      const nuevo: Perfil = { ...perfil, intereses: [...perfil.intereses] };
      for (const c of cambios) {
        if (c.tipo === 'ritmo') nuevo.ritmo = c.ritmo;
        if (c.tipo === 'dias') nuevo.dias = c.dias;
        if (c.tipo === 'anadir-intereses') nuevo.intereses.push(...c.intereses);
        // Sin intereses no se puede planificar: si se quitan todos, se quedan.
        if (c.tipo === 'quitar-intereses' && nuevo.intereses.some((i) => !c.intereses.includes(i))) {
          nuevo.intereses = nuevo.intereses.filter((i) => !c.intereses.includes(i));
        }
      }

      // 3. Los fragmentos del itinerario, con la misma numeración; los de un interés nuevo van detrás.
      // Todos los fragmentos son de la misma guía: la fuente, la URL y la licencia se toman de una cita.
      const delItinerario = itinerario.fuentes[0];
      const metadatos = { fuente: delItinerario?.fuente, url: delItinerario?.url, licencia: delItinerario?.licencia };
      let documentos: Recuperado[] | null = conGuia
        ? itinerario.recuperados.map((r) => ({ text: r.texto, metadata: { ...metadatos, id: r.id, seccion: r.seccion } }))
        : null;
      const anadidos = cambios.flatMap((c) => (c.tipo === 'anadir-intereses' ? c.intereses : []));
      if (documentos && anadidos.length) {
        const elegido = itinerario.modo === 'C2' ? recuperadorAvanzado : recuperador;
        if (!elegido) throw new Error('El modo C2 necesita el recuperador avanzado');
        const consultas = consultasDelPerfil({ ...nuevo, intereses: anadidos }).slice(1).map((c) => c.texto);
        const ids = new Set(documentos.map((d) => String(d.metadata?.id)));
        const nuevos = (await recuperar(ai, elegido, perfil.destino, consultas)).filter((d) => !ids.has(String(d.metadata?.id)));
        documentos = [...documentos, ...nuevos];
      }

      // 4. Solo se rehacen los días afectados; los días de más se quitan y los nuevos se añaden al final.
      const sinCubrir = conGuia ? calcularSinCobertura(nuevo.destino, nuevo.intereses) : [];
      const paraModelo = { ...nuevo, intereses: nuevo.intereses.filter((i) => !sinCubrir.includes(i)) };
      // Los quitados ahora y en ajustes anteriores: si no, «más tranquilo» rehacía todo y los volvía a poner.
      const quitados = [...new Set([...quitadosAntes, ...cambios.flatMap((c) => (c.tipo === 'quitar-lugares' ? c.lugares : []))])];
      const dias: Dia[] = itinerario.dias.slice(0, nuevo.dias);
      const rehechos = diasAfectados(cambios, dias);
      for (const numero of rehechos) {
        const i = dias.findIndex((d) => d.dia === numero);
        const usados = [...lugaresUsados(dias.filter((d) => d.dia !== numero)), ...quitados];
        dias[i] = await generarDia(ai, { perfil: paraModelo, numero, usados, documentos, situar: soloConGuia(documentos, nuevo.destino, situar) });
      }
      const anteriores = dias.length;
      for (let numero = anteriores + 1; numero <= nuevo.dias; numero++) {
        dias.push(
          await generarDia(ai, { perfil: paraModelo, numero, usados: [...lugaresUsados(dias), ...quitados], documentos, situar: soloConGuia(documentos, nuevo.destino, situar) }),
        );
      }
      const nuevosDias = dias.slice(anteriores).map((d) => d.dia);

      const resultado: Itinerario = montarItinerario({
        modo: itinerario.modo,
        destino: nuevo.destino,
        dias,
        documentos,
        interesesSinCobertura: sinCubrir,
      });
      return { perfil: nuevo, itinerario: resultado, quitados, respuesta: describir(cambios, rehechos, nuevosDias, dias.length, avisos) };
    },
  );
}

/** «Hecho: he quitado la Catedral. He rehecho el día 1; el resto se queda igual.» */
function describir(cambios: Cambio[], rehechos: number[], nuevos: number[], total: number, avisos: string[]): string {
  const hecho = cambios.map((c) => {
    switch (c.tipo) {
      case 'ritmo':
        return `ahora con ritmo ${c.ritmo}`;
      case 'dias':
        return c.dias === 1 ? 'ahora es 1 día' : `ahora son ${c.dias} días`;
      case 'quitar-lugares':
        return `he quitado ${lista(c.lugares)}`;
      case 'quitar-intereses':
        return `he quitado ${lista(etiquetas(c.intereses))} de tus intereses`;
      case 'anadir-intereses':
        return `he añadido ${lista(etiquetas(c.intereses))} a tus intereses`;
    }
  });
  const dias = (n: number[]) => (n.length === 1 ? `el día ${n[0]}` : `los días ${lista(n)}`);
  const partes: string[] = [];
  if (rehechos.length && rehechos.length === total) partes.push('He rehecho todos los días');
  else if (rehechos.length) partes.push(`He rehecho ${dias(rehechos)}`);
  if (nuevos.length) partes.push(`${partes.length ? 'he' : 'He'} añadido ${dias(nuevos)}`);
  const tocados = rehechos.length + nuevos.length;
  const detalle = partes.length ? ` ${partes.join(' y ')}${tocados < total ? '; el resto se queda igual' : ''}.` : '';
  return [`Hecho: ${hecho.join(', ')}.${detalle}`, ...avisos].join(' ');
}
