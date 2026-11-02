// RF-01: lógica determinista de la entrevista: qué se guarda de cada respuesta,
// qué se pregunta después y cuándo se termina. El LLM no decide nada de esto.
import { z } from 'genkit';
import { buscarDestino, DESTINOS, normalizar } from '../config/destinos.js';
import { camposPendientes, COMPANIAS, INTERESES, PerfilSchema, PRESUPUESTOS, RITMOS, type Perfil } from './perfil.js';

export type PerfilParcial = Record<string, unknown>;

export interface EstadoEntrevista {
  perfil: PerfilParcial;
  /** Preguntas ya hechas, para no repetirlas y para entender respuestas cortas como «3» o «sí». */
  preguntados: string[];
  /** La conversación hasta ahora, para que el modelo que redacta sepa de qué se ha hablado. */
  historial?: MensajeConversacion[];
}

export interface MensajeConversacion {
  rol: 'viajero' | 'rumbo';
  texto: string;
}

export type Paso =
  | { tipo: 'preguntar'; campo: 'destino' | 'dias' | 'intereses' | 'opcionales' }
  | { tipo: 'confirmar'; perfil: Perfil }
  | { tipo: 'terminar'; perfil: Perfil };

export const ETIQUETAS_INTERES: Record<(typeof INTERESES)[number], string> = {
  monumentos: 'monumentos',
  museos: 'museos',
  gastronomia: 'gastronomía',
  naturaleza: 'naturaleza',
  'ocio-nocturno': 'ocio nocturno',
  compras: 'compras',
  playa: 'playa',
  ninos: 'niños',
};

const ETIQUETAS_COMPANIA: Record<Perfil['compania'], string> = {
  solo: 'viajando solo',
  pareja: 'en pareja',
  familia: 'en familia',
  amigos: 'con amigos',
};

/** Añade al perfil los datos extraídos de la última respuesta. Los valores inválidos se descartan. */
export function fusionarPerfil(perfil: PerfilParcial, extraido: PerfilParcial): PerfilParcial {
  const resultado: PerfilParcial = { ...perfil };
  const forma = PerfilSchema.shape;

  // Solo destinos con guía: si no, la entrevista vuelve a preguntar. Se guarda escrito como en el
  // catálogo («granada» → «Granada») para que coincida con los metadatos de Chroma.
  const destino = typeof extraido.destino === 'string' ? buscarDestino(extraido.destino) : undefined;
  if (destino) resultado.destino = destino.nombre;

  for (const campo of ['dias', 'ritmo', 'presupuesto', 'compania'] as const) {
    const valor = extraido[campo];
    if (valor === null || valor === undefined) continue;
    const validado = forma[campo].safeParse(valor);
    if (validado.success) resultado[campo] = validado.data;
  }

  const interesValido = z.enum(INTERESES);
  const validos = (lista: unknown) => (Array.isArray(lista) ? lista : []).filter((i) => interesValido.safeParse(i).success);
  const anteriores = validos(perfil.intereses);
  const quitar = new Set(validos(extraido.interesesQuitar));
  // Al corregir («quita el ocio nocturno») se quita aunque el extractor también lo haya puesto en intereses.
  const intereses = [...new Set([...anteriores, ...validos(extraido.intereses)])].filter((i) => !quitar.has(i));
  if (intereses.length) resultado.intereses = intereses;
  else delete resultado.intereses;
  return resultado;
}

// Palabras de una respuesta de acuerdo, sin tildes («sí, perfecto», «de acuerdo», «vale, adelante»).
const AFIRMATIVAS = new Set([
  'si', 'vale', 'perfecto', 'correcto', 'ok', 'okay', 'de', 'acuerdo', 'genial', 'adelante',
  'claro', 'bien', 'esta', 'todo', 'eso', 'es', 'exacto', 'venga', 'asi',
]);

/**
 * Reconoce en código una respuesta corta de acuerdo, sin pasar por el modelo: en las pruebas,
 * el extractor convertía «perfecto» en «con amigos, ritmo intenso, presupuesto alto».
 * Si el mensaje tiene cualquier otra palabra («sí, pero mejor 2 días»), no es una simple afirmación.
 */
export function esAfirmacion(mensaje: string): boolean {
  const palabras = normalizar(mensaje).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return palabras.length > 0 && palabras.every((p) => AFIRMATIVAS.has(p));
}

// Palabras con las que empieza una pregunta escrita sin signos. Solo con tilde: sin ella, «como»,
// «que» o «cuando» son también conjunciones («como 3 días», «cuando haga bueno»). «cuantos» y
// «cuantas» sí se admiten sin tilde porque al principio de frase casi siempre preguntan.
const INTERROGATIVAS = new Set(['qué', 'cuánto', 'cuánta', 'cuántos', 'cuántas', 'cuantos', 'cuantas', 'cómo', 'dónde', 'cuál', 'cuáles', 'cuándo']);

/** Si el mensaje del viajero es una pregunta: lleva «?» o empieza por una palabra interrogativa. */
export function esPregunta(mensaje: string): boolean {
  if (mensaje.includes('?')) return true;
  const [primera] = mensaje.trim().toLowerCase().split(/[^\p{L}]+/u);
  return INTERROGATIVAS.has(primera ?? '');
}

/**
 * Respuesta para un destino sin guía. La entrevista no lo acepta (el perfil sí admitiría cualquier
 * destino: los perfiles de prueba de la evaluación se crean directamente, sin entrevista).
 */
export function avisoDestino(destino: string): string | null {
  if (buscarDestino(destino)) return null;
  return `Lo siento, todavía no tengo información de ${destino}. Puedo ayudarte con ${listaDestinos()}. ¿A cuál te gustaría ir?`;
}

/** «Sevilla, Madrid, Barcelona, Granada y Valencia». */
export function listaDestinos(): string {
  const nombres = DESTINOS.map((d) => d.nombre);
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

export function siguientePaso(estado: EstadoEntrevista): Paso {
  const [pendiente] = camposPendientes(estado.perfil);
  if (pendiente) return { tipo: 'preguntar', campo: pendiente };
  // «Voy con mis hijos» da el interés «niños», pero no dice qué más le gusta al viajero: si es lo
  // único que se sabe, se pregunta. Si dijo algo más («monumentos y tapas»), no se repite.
  const intereses = (estado.perfil.intereses as string[] | undefined) ?? [];
  const soloDeducidos = intereses.every((i) => i === 'ninos');
  if (soloDeducidos && !estado.preguntados.includes('intereses')) return { tipo: 'preguntar', campo: 'intereses' };
  // Los opcionales se preguntan una vez, y solo si falta alguno: diciéndolo todo de golpe se
  // pasa directamente a confirmar.
  if (opcionalesPendientes(estado.perfil).length && !estado.preguntados.includes('opcionales')) {
    return { tipo: 'preguntar', campo: 'opcionales' };
  }
  // Antes de planificar, el viajero confirma el perfil: así corrige los errores de extracción.
  const perfil = PerfilSchema.parse(estado.perfil);
  return estado.preguntados.includes('confirmado') ? { tipo: 'terminar', perfil } : { tipo: 'confirmar', perfil };
}

const OPCIONALES = { compania: COMPANIAS, ritmo: RITMOS, presupuesto: PRESUPUESTOS } as const;
export type Opcional = keyof typeof OPCIONALES;

/** Datos opcionales que el viajero aún no ha dado (o no son válidos), en el orden de la pregunta. */
export function opcionalesPendientes(perfil: PerfilParcial): Opcional[] {
  return (Object.keys(OPCIONALES) as Opcional[]).filter(
    (campo) => !(OPCIONALES[campo] as readonly unknown[]).includes(perfil[campo]),
  );
}

/** El perfil en una frase. Los datos de `porDefecto` se marcan: el viajero no los ha dado. */
export function resumirPerfil(perfil: Perfil, porDefecto: Opcional[] = []): string {
  const dias = perfil.dias === 1 ? '1 día' : `${perfil.dias} días`;
  const intereses = perfil.intereses.map((i) => ETIQUETAS_INTERES[i]).join(', ');
  const marca = (campo: Opcional) => (porDefecto.includes(campo) ? ' (por defecto)' : '');
  return (
    `${perfil.destino}, ${dias}, ${ETIQUETAS_COMPANIA[perfil.compania]}${marca('compania')}, ` +
    `ritmo ${perfil.ritmo}${marca('ritmo')}, presupuesto ${perfil.presupuesto}${marca('presupuesto')}. Intereses: ${intereses}.`
  );
}

// Palabras que respaldan cada dato en el mensaje (sin tildes). El extractor rellenaba ritmo
// «normal» y presupuesto «medio» sin que el viajero dijera nada, aunque el prompt lo prohíbe.
const RESPALDO = {
  ritmo: /\b(ritmo|tranquil\w*|relaj\w*|calma\w*|pausad\w*|despacio|sin prisas?|intens\w*|a tope|aprovechar|normal)\b/,
  presupuesto: /\b(presupuesto|barat\w*|economic\w*|gast\w*|dinero|euros?|car[oa]s?|lujo\w*|ahorr\w*|low cost|bajo|medio|alto)\b/,
  // «Un fin de semana en Granada» salía como viaje en pareja.
  compania: /\b(sol[oa]s?|pareja|novi[oa]s?|mujer|marido|espos[oa]s?|famili\w*|hij[oa]s?|nin[oa]s?|peques?|padres?|madre|herman\w*|abuel\w*|amig[oa]s?|colegas|grupo|companer\w*)\b/,
};

// Raíces que respaldan los intereses que el extractor se inventaba (sin tildes): convirtió «la
// cultura» en naturaleza. Son raíces y no palabras para tolerar erratas y variantes. Monumentos,
// museos y gastronomía no se filtran: se deducen de nombres que ninguna lista cubre («el Prado»,
// «la Sagrada Familia», «paella»), y eso el modelo sí lo hace bien.
const RESPALDO_INTERES: Partial<Record<(typeof INTERESES)[number], RegExp>> = {
  naturaleza: /\b(natur|parque|jardin|monta|sender|sierra|rio\b|campo|aire libre|pase|excursion)/,
  'ocio-nocturno': /\b(noche|nocturn|bar\b|bares|copa|fiesta|discotec|salir|marcha|ocio)/,
  compras: /\b(compr|tienda|mercad|shopping|moda)/,
  playa: /\b(playa|mar\b|costa|banar|arena)/,
  ninos: /\b(nin[oa]s?\b|hij|crio|peque|chaval)/,
};
// Monumentos, museos y gastronomía, fuera de la pregunta de intereses: con un simple «Un fin de
// semana en Granada» el extractor los rellenaba. Ahí se exige una de estas raíces o un nombre propio.
const RESPALDO_DEDUCIBLE: Partial<Record<(typeof INTERESES)[number], RegExp>> = {
  monumentos: /\b(monument|catedral|palaci|castill|iglesi|templo|alcazar|alhambra|mezquita|muralla|torre|histori|arquitect|cultur)/,
  museos: /\b(muse|arte\b|pintur|exposic|galeri|cuadro|cultur)/,
  gastronomia: /\b(comer|comid|tapa|tape|gastronom|restaur|cocina|plato|vino|cerve|paella|jamon|marisc|pescad|probar|degust|churro)/,
};

/** Si el mensaje nombra algo con nombre propio que no sea un destino («el Prado», «la Sagrada Familia»). */
function nombraLugar(mensaje: string): boolean {
  return mensaje.split(/[.!?¡¿]+/).some((frase) =>
    frase
      .split(/[^\p{L}]+/u)
      .filter(Boolean)
      .slice(1)
      .some((p) => /^\p{Lu}/u.test(p) && !buscarDestino(p) && normalizar(p) !== 'espana'),
  );
}

// Palabras que el extractor traducía mal y que el código traduce: «cultura» son monumentos y museos.
const CULTURA = /\b(cultur|histori|arte\b)/;

/**
 * Quita los intereses inventados (sin respaldo en el mensaje) y añade monumentos y museos si habla de
 * cultura. Con `estricto` (el mensaje no responde a la pregunta de intereses) también exige respaldo
 * para los que se deducen de nombres, salvo que el mensaje nombre algún lugar.
 */
export function respaldarIntereses(intereses: (typeof INTERESES)[number][], mensaje: string, estricto = false): (typeof INTERESES)[number][] {
  const texto = normalizar(mensaje);
  const conNombre = nombraLugar(mensaje);
  const respaldados = intereses.filter((i) => {
    if (RESPALDO_INTERES[i]) return RESPALDO_INTERES[i].test(texto);
    return !estricto || conNombre || (RESPALDO_DEDUCIBLE[i]?.test(texto) ?? true);
  });
  if (CULTURA.test(texto)) for (const i of ['monumentos', 'museos'] as const) if (!respaldados.includes(i)) respaldados.push(i);
  return respaldados;
}

/** Quita el ritmo y el presupuesto extraídos si el mensaje no habla de ellos. */
export function descartarSinRespaldo<T extends { ritmo: unknown; presupuesto: unknown; compania: unknown }>(extraido: T, mensaje: string): T {
  const texto = normalizar(mensaje);
  return {
    ...extraido,
    ritmo: RESPALDO.ritmo.test(texto) ? extraido.ritmo : null,
    presupuesto: RESPALDO.presupuesto.test(texto) ? extraido.presupuesto : null,
    compania: RESPALDO.compania.test(texto) ? extraido.compania : null,
  };
}
