// RF-11: interpretación en código de las peticiones de cambio sobre un itinerario ya hecho
// («más tranquilo», «quita la Catedral», «añade museos», «un día más»). Sin LLM: son pocas
// formas de pedirlo y el modelo pequeño se inventaba datos al extraer (ver la entrevista).
import { normalizar } from '../config/destinos.js';
import { NOMBRADOS } from './entrevista-logica.js';
import type { Dia } from './itinerario.js';
import { RITMOS, type INTERESES, type Perfil } from './perfil.js';

type Interes = (typeof INTERESES)[number];

export type Cambio =
  | { tipo: 'ritmo'; ritmo: Perfil['ritmo'] }
  | { tipo: 'dias'; dias: number }
  | { tipo: 'quitar-lugares'; lugares: string[] }
  | { tipo: 'quitar-intereses'; intereses: Interes[] }
  | { tipo: 'anadir-intereses'; intereses: Interes[] };

const QUITAR = /\b(quit\w*|elimin\w*|borr\w*|sin|no quiero|cambi\w*|fuera|en vez de)\b/;
const ANADIR = /\b(anad\w*|pon|ponme|inclu\w*|mete|agreg\w*|tambien|quiero|mas)\b/;
const BAJAR_RITMO = /\b(mas tranquil\w*|mas relajad\w*|menos (cosas|actividades|prisas?)|menos intens\w*|mas calma)\b/;
const SUBIR_RITMO = /\b(mas intens\w*|mas (cosas|actividades)|menos tranquil\w*|a tope)\b/;

// Palabras de los nombres de lugar que no los distinguen: «quita el museo» se entiende como el
// interés, no como un museo concreto.
const GENERICAS = new Set(['barrio', 'plaza', 'parque', 'calle', 'museo', 'iglesia', 'palacio', 'torre', 'mercado', 'real', 'reales', 'santa', 'jardin', 'jardines']);

const palabras = (texto: string) => normalizar(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Si el mensaje nombra el lugar: alguna palabra distintiva suya, o el principio de una («Alcázar» → «Alcázares»). */
function nombraLugar(mensaje: string[], lugar: string, destino: string): boolean {
  const destinoNormal = normalizar(destino);
  const propias = palabras(lugar).filter((p) => p.length >= 4 && !GENERICAS.has(p) && p !== destinoNormal);
  return propias.some((p) => mensaje.some((m) => m === p || (m.length >= 5 && (p.startsWith(m) || m.startsWith(p)))));
}

/** Cambios que pide el mensaje, en orden: ritmo, días, lugares e intereses. Vacío si no entiende ninguno. */
export function interpretarAjuste(mensaje: string, perfil: Perfil, lugares: string[]): Cambio[] {
  const texto = normalizar(mensaje);
  const cambios: Cambio[] = [];

  const nivel = RITMOS.indexOf(perfil.ritmo);
  const nuevoNivel = BAJAR_RITMO.test(texto) ? nivel - 1 : SUBIR_RITMO.test(texto) ? nivel + 1 : nivel;
  const ritmo = RITMOS[Math.max(0, Math.min(RITMOS.length - 1, nuevoNivel))]!;
  if (ritmo !== perfil.ritmo) cambios.push({ tipo: 'ritmo', ritmo });

  const numero = texto.match(/\b(\d+)\s*dias?\b/);
  const dias = numero ? Number(numero[1]) : /\bun dia mas\b/.test(texto) ? perfil.dias + 1 : /\bun dia menos\b/.test(texto) ? perfil.dias - 1 : perfil.dias;
  const diasValidos = Math.max(1, Math.min(7, dias));
  if (diasValidos !== perfil.dias) cambios.push({ tipo: 'dias', dias: diasValidos });

  const quitar = QUITAR.test(texto);
  const enMensaje = palabras(mensaje);
  const nombrados = quitar ? lugares.filter((l) => nombraLugar(enMensaje, l, perfil.destino)) : [];
  if (nombrados.length) cambios.push({ tipo: 'quitar-lugares', lugares: nombrados });

  const mencionados = (Object.entries(NOMBRADOS) as [Interes, RegExp][]).filter(([, patron]) => patron.test(texto)).map(([i]) => i);
  const aQuitar = quitar ? mencionados.filter((i) => perfil.intereses.includes(i)) : [];
  const aAnadir = !quitar && ANADIR.test(texto) ? mencionados.filter((i) => !perfil.intereses.includes(i)) : [];
  if (aQuitar.length) cambios.push({ tipo: 'quitar-intereses', intereses: aQuitar });
  if (aAnadir.length) cambios.push({ tipo: 'anadir-intereses', intereses: aAnadir });
  return cambios;
}

/** Días que hay que rehacer: solo los afectados (RF-11). Los cambios de días se resuelven aparte. */
export function diasAfectados(cambios: Cambio[], dias: Dia[]): number[] {
  const afectados = new Set<number>();
  const actividades = (d: Dia) => [...d.manana, ...d.tarde, ...d.noche];
  for (const cambio of cambios) {
    if (cambio.tipo === 'ritmo' || cambio.tipo === 'anadir-intereses') dias.forEach((d) => afectados.add(d.dia));
    if (cambio.tipo === 'quitar-lugares') {
      for (const d of dias) if (actividades(d).some((a) => cambio.lugares.includes(a.lugar))) afectados.add(d.dia);
    }
    if (cambio.tipo === 'quitar-intereses') {
      const patrones = cambio.intereses.map((i) => NOMBRADOS[i]).filter((p): p is RegExp => Boolean(p));
      for (const d of dias) {
        if (actividades(d).some((a) => patrones.some((p) => p.test(normalizar(`${a.lugar} ${a.descripcion}`))))) afectados.add(d.dia);
      }
    }
  }
  return [...afectados].sort((a, b) => a - b);
}
